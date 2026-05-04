import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "VisualLoraPicker";

app.registerExtension({
    name: "visual_picker.LoraPicker",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        $el("style", {
            textContent: `
                .vlp-container{display:flex;flex-direction:column;background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.5)}
                .vlp-collapse{overflow:hidden;transition:all .4s cubic-bezier(.25,1,.5,1);max-height:0;opacity:0}
                .vlp-collapse.open{max-height:500px;opacity:1}
                .vlp-preview{position:relative;height:280px;background:#080808;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #222}
                .vlp-preview img{max-width:100%;max-height:100%;object-fit:contain}
                .vlp-btn{background:#1a1a1a;color:#aaa;border:none;padding:10px;cursor:pointer;font-size:9px;font-weight:600;letter-spacing:1px;display:flex;justify-content:space-between}
                .vlp-btn:hover{background:#252525;color:#00b4ff}
                .vlp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;padding:12px;max-height:300px;overflow-y:auto;background:#0f0f0f;position:relative}
                .vlp-grid::-webkit-scrollbar{width:4px}
                .vlp-grid::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
                .vlp-item{position:relative;aspect-ratio:1/1;background:#1a1a1a;cursor:pointer;border:2px solid transparent;border-radius:4px;overflow:hidden}
                .vlp-item img{width:100%;height:100%;object-fit:cover}
                .vlp-item.selected{border-color:#00b4ff;box-shadow:0 0 8px rgba(0,180,255,.4)}
                .vlp-overlay{position:absolute;bottom:0;left:0;right:0;padding:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:8px;text-align:center;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .vlp-msg{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;padding:40px;font-size:12px;text-transform:uppercase;letter-spacing:1px}
                .vlp-modal-btn{position:absolute;top:5px;right:5px;height:30px;background:#333;color:#fff;border-radius:3px;border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;z-index:10}
                .vlp-modal-btn:hover{background:#00b4ff}
                .vlp-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000}
                .vlp-modal-box{width: 80%; height: 80%;background:#1a1a1a;padding:30px;border:2px solid #00b4ff;border-radius:10px;box-shadow:0 0 20px rgba(0,180,255,0.3);color:#fff;font-size:14px;font-weight:bold;display:flex;flex-direction:column;align-items:center;gap:15px}
                .vlp-modal-box img{max-width:80vw;max-height:50vh;object-fit:contain;border-radius:4px}
                .vlp-modal-grid-wrapper{ width: 100%; overflow: hidden; border-top: 1px solid #333; padding-top: 10px; }
                .vlp-modal-box .vlp-overlay{ font-size:12px; }
            `,
            parent: document.head,
        });
    },

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_NAME) return;

        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const loraWidget = node.widgets.find(w => w.name === "selected_lora");
        const sortWidget = node.widgets.find(w => w.name === "sort_method");

        const previewImg = $el("img");
        const gridView = $el("div.vlp-grid");
        
        const openModal = () => {
            const modalGrid = gridView.cloneNode(true);
            modalGrid.style.width = "100%";
            modalGrid.style.maxHeight = "100%";
            modalGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
            
            modalGrid.querySelectorAll(".vlp-item").forEach((item, idx) => {
                item.style.width = "auto";
                item.style.maxWidth = "360px";
                item.style.justifySelf = "centrer";
                item.style.width = "100%"
                item.onclick = () => {
                    const originalItems = gridView.querySelectorAll(".vlp-item");
                    if(originalItems[idx]) originalItems[idx].click();
                    modalOverlay.remove();
                };
            });

            const modalOverlay = $el("div.vlp-modal-overlay", {
                onclick: (e) => { if(e.target === modalOverlay) modalOverlay.remove(); }
            }, [
                $el("div.vlp-modal-box", [
                    $el("div", { textContent: "Selected: " + loraWidget?.value?.replace(".safetensors", "").toUpperCase() || "NO LORA SELECTED" }),
                    $el("div.vlp-modal-grid-wrapper", [modalGrid])
                ])
            ]);
            document.body.appendChild(modalOverlay);
        };

        const modalBtn = $el("button.vlp-modal-btn", { 
            textContent: "⛶",
            onclick: (e) => { e.stopPropagation(); openModal(); }
        });

        const previewColl = $el("div.vlp-collapse.open", [$el("div.vlp-preview", [modalBtn, previewImg])]);
        const btnPrev = $el("button.vlp-btn");
        const gridColl = $el("div.vlp-collapse", [gridView]);
        const btnGrid = $el("button.vlp-btn", { textContent: "LORA COLLECTION ▼" });

        let fitRafId;
        let domWidget;

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
            const file = loraWidget?.value;
            const icon = previewColl.classList.contains("open") ? " ▲" : " ▼";
            if (path && file) {
                const nameNoExt = file.replace(".safetensors", "");
                const item = gridView.querySelector(`.vlp-item.selected img`);
                if (item) {
                    previewImg.src = item.src;
                } else {
                    previewImg.src = `/visual_picker/view_lora?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(nameNoExt)}.webp`;
                }
                btnPrev.textContent = nameNoExt.toUpperCase() + icon;
            } else {
                previewImg.src = "/visual_picker/no-selection";
                btnPrev.textContent = "SELECT A LORA" + icon;
            }
        };

        const cleanupWatcher = () => {
            if (node._vlp_watcher) {
                clearInterval(node._vlp_watcher);
                node._vlp_watcher = null;
            }
            if (node._vlp_conn_timeout) {
                clearTimeout(node._vlp_conn_timeout);
                node._vlp_conn_timeout = null;
            }

            if (node._vlp_origin_widget && node._vlp_origin_widget._vlp_old_cb) {
                node._vlp_origin_widget.callback = node._vlp_origin_widget._vlp_old_cb;
                node._vlp_origin_widget._vlp_old_cb = null;
                node._vlp_origin_widget = null;
            }
        };

        node.onConnectionsChange = function (type, index, connected, link_info) {
            const inputName = this.inputs[index]?.name;
            if (type === 1 && inputName === "opt_folder_path") {
                cleanupWatcher();

                if (connected && link_info) {
                    node._vlp_conn_timeout = setTimeout(() => {
                        const link = app.graph.links[link_info.id];
                        if (!link) return;
                        
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (!originNode || !originNode.widgets || originNode.widgets.length === 0) {
                            setTimeout(() => node.onConnectionsChange(type, index, connected, link_info), 100);
                            return;
                        }

                        const originWidget = originNode.widgets.find(w => w.name === "folder_path") || originNode.widgets[0];
                        if (!originWidget) return;

                        node._vlp_origin_widget = originWidget;
                        if (!originWidget._vlp_old_cb) originWidget._vlp_old_cb = originWidget.callback;

                        const sync = (newVal) => {
                            if (pathWidget && newVal && pathWidget.value !== newVal) {
                                pathWidget.value = newVal;
                                if (pathWidget.callback) pathWidget.callback(newVal);
                                if (node.loadLoras) node.loadLoras(); 
                            }
                        };

                        originWidget.callback = function() {
                            const res = originWidget._vlp_old_cb ? originWidget._vlp_old_cb.apply(this, arguments) : undefined;
                            sync(this.value);
                            return res;
                        };

                        node._vlp_watcher = setInterval(() => sync(originWidget.value), 250);
                        sync(originWidget.value);
                    }, 300);
                }
            }
        };

        if (pathWidget) {
            const oldCb = pathWidget.callback;
            pathWidget.callback = function() {
                if (oldCb) oldCb.apply(this, arguments);
                if (loraWidget) loraWidget.value = ""; 
                if (gridColl.classList.contains("open")) node.loadLoras();
                update(); 
                fit();
            };
        }

        if (sortWidget) {
            const oldSortCb = sortWidget.callback;
            sortWidget.callback = function() {
                if (oldSortCb) oldSortCb.apply(this, arguments);
                if (gridColl.classList.contains("open")) node.loadLoras();
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


        btnPrev.onclick = () => { previewColl.classList.toggle("open"); update(); animateFit(); };
        btnGrid.onclick = () => {
            const open = gridColl.classList.toggle("open");
            btnGrid.innerHTML = `<span>BROWSE COLLECTION</span><span>${open?'✕':'⧉'}</span>`;
            if (open && pathWidget?.value) node.loadLoras();
            animateFit();
        };

        node.loadLoras = async () => {
            const path = pathWidget?.value;
            const sort = sortWidget?.value || "newest_first";
            if (!path) {
                gridView.innerHTML = `<div class="vlp-msg"><span>⚠️</span><span>Path is empty</span></div>`;
                return;
            }
            try {
                const res = await api.fetchApi("/visual_picker/loras", {
                    method: "POST",
                    body: JSON.stringify({ folder_path: path, sort_method: sort })
                });
                const loras = await res.json();
                const files = Object.keys(loras);
                if (!files.length) {
                    gridView.innerHTML = `<div class="vlp-msg"><span>📂</span><span>No LoRAs found</span></div>`;
                    return;
                }
                gridView.innerHTML = "";
                files.forEach(f => {
                    const data = loras[f];
                    const item = $el("div.vlp-item", {
                        onclick: () => {
                            loraWidget.value = f;
                            if (loraWidget.callback) loraWidget.callback(f);
                            gridView.querySelectorAll(".vlp-item").forEach(i => i.classList.remove("selected"));
                            item.classList.add("selected");
                            update();
                        }
                    }, [
                        $el("img", { src: data.preview_url }),
                        $el("div.vlp-overlay", { textContent: f.replace(".safetensors", "") })
                    ]);
                    if (loraWidget.value === f) item.classList.add("selected");
                    gridView.appendChild(item);
                });
            } catch (e) {
                gridView.innerHTML = `<div class="vlp-msg"><span>🚫</span><span>Access error</span></div>`;
            }
            fit();
        };

        const container = $el("div.vlp-container", [btnPrev, previewColl, btnGrid, gridColl]);
        domWidget = node.addDOMWidget("lora_picker_ui", "div", container);

        node.onConfigure = function() {
            if (update) update.apply(this);

            const hasWidgetValue = !!pathWidget?.value;
            const input = this.inputs?.find(i => i.name === "opt_folder_path");
            const hasLink = input && input.link !== null;

            if (hasWidgetValue || hasLink) {
                setTimeout(() => {
                    this.loadLoras();
                    if (fit) fit.apply(this);
                }, 50);
            }
        };        

        node.onRemoved = function() {
            cancelAnimationFrame(fitRafId);
            cleanupWatcher();
            window.removeEventListener("wheel", handleWheel, { capture: true });
            if (this._vip_watcher) clearInterval(this._vip_watcher);
        };
        
        node.size = [350, 200];
        setTimeout(() => { update(); fit(); }, 100);
    }
});