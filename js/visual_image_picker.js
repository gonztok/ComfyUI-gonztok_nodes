import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "VisualImagePicker";

app.registerExtension({
    name: "visual_picker.ImagePicker",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        $el("style", {
            textContent: `.vip-container{display:flex;flex-direction:column;background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.5)}.vip-collapse{overflow:hidden;transition:all .4s cubic-bezier(.25,1,.5,1);max-height:0;opacity:0}.vip-collapse.open{max-height:500px;opacity:1}.vip-preview{position:relative;height:280px;background:#080808;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #222;overflow:hidden}.vip-preview img{max-width:100%;max-height:100%;object-fit:contain;transition:transform .4s cubic-bezier(.25,1,.5,1);will-change:transform}.vip-preview:hover img{transform:none}.vip-overlay{position:absolute;bottom:-1px;left:0;right:0;z-index:2;padding:35px 12px 12px;background:linear-gradient(to top,rgba(0,0,0,1) 0%,rgba(0,0,0,.9) 20%,transparent 100%);color:#fff;font-size:10px;letter-spacing:.5px;text-transform:uppercase;pointer-events:none;transform:translateZ(0)}.vip-btn{background:#1a1a1a;color:#aaa;border:none;padding:10px;cursor:pointer;font-size:9px;font-weight:600;letter-spacing:1px;transition:all .2s ease;text-align:left;display:flex;justify-content:space-between}.vip-btn:hover{background:#252525;color:#00b4ff}.vip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;padding:12px;min-height:150px;max-height:300px;overflow-y:auto;background:#0f0f0f;align-content:start;position:relative}.vip-grid::-webkit-scrollbar{width:4px}.vip-grid::-webkit-scrollbar-thumb{background:#333;border-radius:2px}.vip-item{position:relative;width:100%;aspect-ratio:1/1;background:#1a1a1a;cursor:pointer;border:2px solid transparent;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center}.vip-item img{width:100%;height:100%;object-fit:cover;display:block}.vip-item:hover{filter:grayscale(0);transform:translateY(-2px)}.vip-item.selected{border-color:#00b4ff;box-shadow:0 0 8px rgba(0,180,255,.4)}.vip-msg{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;font-size:14px;padding:60px 20px;text-align:center;font-weight:500;letter-spacing:1px;text-transform:uppercase}`,
            parent: document.head,
        });
    },

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_NAME) return;

        const PLACEHOLDER_SRC = "/visual_picker/no-selection";
        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const imgWidget = node.widgets.find(w => w.name === "selected_image");
        const sortWidget = node.widgets.find(w => w.name === "sort_method");

        const previewImg = $el("img");
        const previewLab = $el("div.vip-overlay", { textContent: "No selection" });
        const previewColl = $el("div.vip-collapse.open", [$el("div.vip-preview", [previewImg, previewLab])]);
        const btnPrev = $el("button.vip-btn");

        const gridView = $el("div.vip-grid");
        const gridColl = $el("div.vip-collapse", [gridView]);
        const btnGrid = $el("button.vip-btn", { textContent: "GALLERY ▼" });

        let fitRafId;

        const fit = () => {
            if (!domWidget) return;
            // Temporarily set height:auto so flex children are NOT constrained by
            // LiteGraph's previous container size, then read the true content height.
            // scrollHeight correctly reflects the CSS max-height transition on
            // vip-collapse elements, so this also drives smooth open/close animation.
            container.style.height = "auto";
            const h = container.scrollHeight;
            container.style.height = h + "px";
            domWidget.computeSize = () => [node.size[0], h];
            node.setSize([node.size[0], node.computeSize()[1]]);
            app.graph.setDirtyCanvas(true, true);
        };

        const animateFit = (duration = 420) => {
            const end = performance.now() + duration;
            cancelAnimationFrame(fitRafId);
            const tick = (now) => {
                fit();
                if (now < end) fitRafId = requestAnimationFrame(tick);
            };
            fitRafId = requestAnimationFrame(tick);
        };

        const update = () => {
            const path = pathWidget?.value;
            const file = imgWidget?.value;
            const icon = previewColl.classList.contains("open") ? " ▲" : " ▼";
            previewImg.style.display = "block";
            if (path && file) {
                previewImg.src = `/visual_picker/view?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(file)}`;
                previewLab.textContent = file;
                btnPrev.textContent = file.toUpperCase() + icon;
            } else {
                previewImg.src = PLACEHOLDER_SRC;
                btnPrev.textContent = "PREVIEW" + icon;
            }
        };

        const clearSync = () => {
            if (node._vip_watcher) {
                clearInterval(node._vip_watcher);
                node._vip_watcher = null;
            }
            if (node._vip_target_widget && node._vip_old_cb) {
                node._vip_target_widget.callback = node._vip_old_cb;
                node._vip_target_widget._vip_patched = false;
            }
            node._vip_target_widget = null;
            node._vip_old_cb = null;
        };

        node.onConnectionsChange = function (type, index, connected, link_info) {
            if (type === 1) {
                clearSync();
                if (connected && link_info) {
                    setTimeout(() => {
                        const link = app.graph.links[link_info.id];
                        if (!link) return;
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (!originNode) return;

                        const originWidget = originNode.widgets?.find(w => w.name === "folder_path") || originNode.widgets?.[0];
                        if (!originWidget) return;

                        node._vip_target_widget = originWidget;
                        node._vip_old_cb = originWidget.callback;

                        const sync = (newVal) => {
                            if (pathWidget.value !== newVal) {
                                pathWidget.value = newVal;
                                if (pathWidget.callback) pathWidget.callback(newVal);
                            }
                        };

                        originWidget.callback = function() {
                            const res = node._vip_old_cb ? node._vip_old_cb.apply(this, arguments) : undefined;
                            sync(this.value);
                            return res;
                        };

                        node._vip_watcher = setInterval(() => sync(originWidget.value), 250);
                        sync(originWidget.value);
                    }, 200);
                }
            }
        };

        btnPrev.onclick = () => { previewColl.classList.toggle("open"); update(); animateFit(); };
        btnGrid.onclick = () => {
            const open = gridColl.classList.toggle("open");
            btnGrid.innerHTML = `<span>BROWSE COLLECTION</span><span>${open?'✕':'⧉'}</span>`;
            if (open && !gridView.innerHTML && pathWidget?.value) node.loadImages();
            animateFit();
        };

        if (pathWidget) {
            const oldCb = pathWidget.callback;
            pathWidget.callback = function() {
                if (oldCb) oldCb.apply(this, arguments);
                if (imgWidget) imgWidget.value = "";
                gridView.replaceChildren();
                if (gridColl.classList.contains("open")) node.loadImages();
                update(); 
                fit();
            };
        }

        if (sortWidget) {
            const oldSortCb = sortWidget.callback;
            sortWidget.callback = function() {
                if (oldSortCb) oldSortCb.apply(this, arguments);
                if (gridColl.classList.contains("open")) node.loadImages();
            };
        }

        const handleWheel = (e) => {
            if (gridView.contains(e.target)) {
                e.stopPropagation(); 
                e.preventDefault();
                gridView.scrollTop += e.deltaY;
            }
        };
        window.addEventListener("wheel", handleWheel, { capture: true, passive: false });

        const container = $el("div.vip-container", [btnPrev, previewColl, btnGrid, gridColl]);
        const domWidget = node.addDOMWidget("visualimagepicker_grid", "div", container);

        node.loadImages = async () => {
            const path = pathWidget?.value;
            const sort = sortWidget?.value || "newest_first";
            if (!path) { 
                gridView.innerHTML = `<div class="vip-msg"><span>⚠️</span><span>Empty path</span></div>`; 
                return; 
            }
            try {
                const res = await api.fetchApi("/visual_picker/images", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_path: path, sort_method: sort })
                });
                const images = await res.json();
                const files = Object.keys(images);
                
                gridView.replaceChildren();
                if (!files.length) {
                    gridView.innerHTML = `<div class="vip-msg"><span>📂</span><span>Empty folder</span></div>`;
                }

                files.forEach(f => {
                    const item = $el("div.vip-item", {
                        onclick: () => {
                            if (imgWidget) { 
                                imgWidget.value = f; 
                                if (imgWidget.callback) imgWidget.callback(f); 
                            }
                            gridView.querySelectorAll(".vip-item").forEach(i => i.classList.remove("selected"));
                            item.classList.add("selected");
                            update();
                        }
                    }, [$el("img", { src: `/visual_picker/view?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(f)}` })]);
                    if (imgWidget?.value === f) item.classList.add("selected");
                    gridView.appendChild(item);
                });
            } catch (e) {
                gridView.innerHTML = `<div class="vip-msg"><span>🚫</span><span>Access error</span></div>`;
            }
            fit();
        };

        node.onConfigure = () => { 
            update(); 
            if (pathWidget?.value) node.loadImages(); 
            fit(); 
        };
        
        node.onRemoved = () => {
            cancelAnimationFrame(fitRafId);
            window.removeEventListener("wheel", handleWheel, { capture: true });
            if (node._vip_watcher) clearInterval(node._vip_watcher);
        };
        
        node.size = [350, 180];
        setTimeout(() => { update(); fit(); }, 100);
    }
});