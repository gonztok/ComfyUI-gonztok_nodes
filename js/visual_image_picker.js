import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "VisualImagePicker";

app.registerExtension({
    name: "visual_picker.ImagePicker",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        $el("style", {
            textContent: `.vip-container{display:flex;flex-direction:column;background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.5);font-family: "Segoe UI Emoji", "Segoe UI Symbol", "Apple Color Emoji", "Noto Color Emoji", sans-serif;}.vip-collapse{overflow:hidden;transition:all .4s cubic-bezier(.25,1,.5,1);max-height:0;opacity:0}.vip-collapse.open{max-height:800px;opacity:1}.vip-preview-area{background:#080808;border-bottom:1px solid #222;display:flex;flex-direction:column;height:320px}.vip-preview{position:relative;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}.vip-preview img{max-width:100%;max-height:100%;object-fit:contain;transition:transform .4s cubic-bezier(.25,1,.5,1);will-change:transform}.vip-thumb-row{display:none;gap:4px;padding:0 12px 12px;justify-content:center;background:#080808;flex-shrink:0}.vip-thumb-item{position:relative;width:50px;height:50px;border:1px solid #333;border-radius:4px;overflow:hidden;background:#111}.vip-thumb-item img{width:100%;height:100%;object-fit:cover}.vip-thumb-more{position:absolute;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;color:#00b4ff;font-size:12px;font-weight:bold;letter-spacing:1px}.vip-overlay{position:absolute;bottom:-1px;left:0;right:0;z-index:2;padding:35px 12px 12px;background:linear-gradient(to top,rgba(0,0,0,1) 0%,rgba(0,0,0,.9) 20%,transparent 100%);color:#fff;font-size:10px;letter-spacing:.5px;text-transform:uppercase;pointer-events:none;transform:translateZ(0)}.vip-btn{background:#1a1a1a;color:#aaa;border:none;padding:10px;cursor:pointer;font-size:9px;font-weight:600;letter-spacing:1px;transition:all .2s ease;text-align:left;display:flex;justify-content:space-between;width:100%;align-items:center;height:32px;box-sizing:border-box}.vip-btn:hover{background:#252525;color:#00b4ff}.vip-btn.active{color:#00b4ff;background:#1e2a30}.vip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;padding:12px;min-height:150px;max-height:300px;overflow-y:auto;background:#0f0f0f;align-content:start;position:relative}.vip-grid::-webkit-scrollbar{width:4px}.vip-grid::-webkit-scrollbar-thumb{background:#333;border-radius:2px}.vip-item{position:relative;width:100%;aspect-ratio:1/1;background:#1a1a1a;cursor:pointer;border:2px solid transparent;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center}.vip-item img{width:100%;height:100%;object-fit:cover;display:block}.vip-item:hover{filter:grayscale(0);transform:translateY(-2px)}.vip-item.selected{border-color:#00b4ff;box-shadow:0 0 8px rgba(0,180,255,.4)}.vip-msg{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;font-size:14px;padding:60px 20px;text-align:center;font-weight:500;letter-spacing:1px;text-transform:uppercase}.vip-bar-wrapper{position:relative;display:flex;align-items:center;height:32px;background:#1a1a1a}.vip-multi-toggle{position:absolute;right:32px;top:0;bottom:0;width:28px;background:none;border:none;color:#555;cursor:pointer;font-size:12px;transition:all .2s;z-index:10;display:flex;align-items:center;justify-content:center;padding:0}.vip-multi-toggle.active{color:#00b4ff;text-shadow:0 0 5px rgba(0,180,255,.5)}.vip-multi-toggle:hover{color:#eee}.vip-icon-span{display:flex;align-items:center;justify-content:center;width:20px;height:100%}`,
            parent: document.head,
        });
    },

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_NAME) return;

        const PLACEHOLDER_SRC = "/visual_picker/no-selection";
        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const imgWidget = node.widgets.find(w => w.name === "selected_image");
        const sortWidget = node.widgets.find(w => w.name === "sort_method");

        let multiSelectEnabled = false;

        const previewImg = $el("img");
        const previewLab = $el("div.vip-overlay", { textContent: "No selection" });
        const thumbRow = $el("div.vip-thumb-row");
        const previewColl = $el("div.vip-collapse.open", [
            $el("div.vip-preview-area", [
                $el("div.vip-preview", [previewImg, previewLab]),
                thumbRow
            ])
        ]);
        
        const btnPrev = $el("button.vip-btn", { 
            innerHTML: `<span>PREVIEW</span><span class="vip-icon-span">▲</span>` 
        });

        const gridView = $el("div.vip-grid");
        const gridColl = $el("div.vip-collapse", [gridView]);
        
        const btnMulti = $el("button.vip-multi-toggle", { 
            innerHTML: `⧉`,
            title: "Toggle Multi-Select",
            onclick: (e) => {
                e.stopPropagation();
                multiSelectEnabled = !multiSelectEnabled;
                btnMulti.classList.toggle("active", multiSelectEnabled);
            }
        });

        const btnGrid = $el("button.vip-btn", { 
            innerHTML: `<span>BROWSE COLLECTION</span><span class="vip-icon-span">🗄</span>` 
        });
        const browseBar = $el("div.vip-bar-wrapper", [btnGrid, btnMulti]);

        let fitRafId;

        const getSelectedFiles = () => {
            const val = imgWidget?.value || "";
            return val ? val.split("|||") : [];
        };

        const fit = () => {
            if (!domWidget) return;
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
            const selections = getSelectedFiles();
            const latestFile = selections[selections.length - 1];
            const icon = previewColl.classList.contains("open") ? "▲" : "▼";
            
            previewImg.style.display = "block";
            const labelSpan = btnPrev.querySelector("span:first-child");
            const iconSpan = btnPrev.querySelector("span:last-child");

            thumbRow.replaceChildren();
            thumbRow.style.display = selections.length > 1 ? "flex" : "none";

            if (path && latestFile) {
                previewLab.style.display = "block";
                previewImg.src = `/visual_picker/view?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(latestFile)}`;
                previewLab.textContent = selections.length > 1 ? `${selections.length} FILES SELECTED` : latestFile;
                labelSpan.textContent = (selections.length > 1 ? "MULTIPLE SELECTION" : latestFile.toUpperCase());

                if (selections.length > 1) {
                    const others = selections.slice(0, -1).reverse().slice(0, 4);
                    others.forEach((f, idx) => {
                        const isLastSlot = idx === 3;
                        const hasMore = selections.length > 5;
                        
                        const t = $el("div.vip-thumb-item", [
                            $el("img", { src: `/visual_picker/view?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(f)}` })
                        ]);

                        if (isLastSlot && hasMore) {
                            const moreCount = selections.length - 5;
                            t.appendChild($el("div.vip-thumb-more", { textContent: `+${moreCount}` }));
                        }

                        thumbRow.appendChild(t);
                    });
                }
            } else {
                previewLab.style.display = "none";
                previewImg.src = PLACEHOLDER_SRC;
                labelSpan.textContent = "PREVIEW";
            }
            iconSpan.textContent = icon;
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
            const iconSpan = btnGrid.querySelector("span:last-child");
            iconSpan.style.color = open ? '#00b4ff' : ''; 
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

        const handleWheel = (e) => {
            if (gridView.contains(e.target)) {
                e.stopPropagation(); 
                e.preventDefault();
                gridView.scrollTop += e.deltaY;
            }
        };
        window.addEventListener("wheel", handleWheel, { capture: true, passive: false });

        const container = $el("div.vip-container", [btnPrev, previewColl, browseBar, gridColl]);
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
                const currentSelections = getSelectedFiles();
                
                gridView.replaceChildren();
                files.forEach(f => {
                    const item = $el("div.vip-item", {
                        onclick: (e) => {
                            let selections = getSelectedFiles();
                            const isMulti = multiSelectEnabled || e.ctrlKey || e.metaKey;
                            
                            if (isMulti) {
                                if (selections.includes(f)) {
                                    selections = selections.filter(s => s !== f);
                                } else {
                                    selections.push(f);
                                }
                            } else {
                                selections = [f];
                            }

                            imgWidget.value = selections.join("|||"); 
                            if (imgWidget.callback) imgWidget.callback(imgWidget.value); 

                            gridView.querySelectorAll(".vip-item").forEach(i => {
                                i.classList.toggle("selected", selections.includes(i._filename));
                            });
                            update();
                            animateFit();
                        }
                    }, [$el("img", { src: `/visual_picker/view?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(f)}` })]);
                    
                    item._filename = f;
                    if (currentSelections.includes(f)) item.classList.add("selected");
                    gridView.appendChild(item);
                });
            } catch (e) {
                gridView.innerHTML = `<div class="vip-msg"><span>🚫</span><span>Access error</span></div>`;
            }
            fit();
        };

        node.onConfigure = () => { update(); if (pathWidget?.value) node.loadImages(); fit(); };
        node.onRemoved = () => {
            cancelAnimationFrame(fitRafId);
            window.removeEventListener("wheel", handleWheel, { capture: true });
            if (node._vip_watcher) clearInterval(node._vip_watcher);
        };
        
        node.size = [350, 180];
        setTimeout(() => { update(); fit(); }, 100);
    }
});