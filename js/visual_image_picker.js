import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "VisualImagePicker";

app.registerExtension({
    name: "visual_picker.ImagePicker",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        $el("style", {
            textContent: `
                .vip-container{display:flex;flex-direction:column;background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.5);font-family: "Segoe UI Emoji", "Segoe UI Symbol", "Apple Color Emoji", "Noto Color Emoji", sans-serif;}
                .vip-collapse{overflow:hidden;transition:all .4s cubic-bezier(.25,1,.5,1);max-height:0;opacity:0}
                .vip-collapse.open{max-height:800px;opacity:1}
                .vip-preview-area{background:#080808;border-bottom:1px solid #222;display:flex;flex-direction:column;height:320px}
                .vip-preview{position:relative;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
                .vip-preview img{max-width:100%;max-height:100%;object-fit:contain;transition:transform .4s cubic-bezier(.25,1,.5,1);will-change:transform}
                .vip-thumb-row{display:none;gap:4px;padding:0 12px 12px;justify-content:center;background:#080808;flex-shrink:0}
                .vip-thumb-item{position:relative;width:50px;height:50px;border:1px solid #333;border-radius:4px;overflow:hidden;background:#111}
                .vip-thumb-item img{width:100%;height:100%;object-fit:cover}
                .vip-thumb-more{position:absolute;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;color:#00b4ff;font-size:12px;font-weight:bold;letter-spacing:1px}
                .vip-overlay{position:absolute;bottom:-1px;left:0;right:0;z-index:2;padding:35px 12px 12px;background:linear-gradient(to top,rgba(0,0,0,1) 0%,rgba(0,0,0,.9) 20%,transparent 100%);color:#fff;font-size:10px;letter-spacing:.5px;text-transform:uppercase;pointer-events:none;transform:translateZ(0)}
                .vip-btn{background:#1a1a1a;color:#aaa;border:none;padding:10px;cursor:pointer;font-size:9px;font-weight:600;letter-spacing:1px;transition:all .2s ease;text-align:left;display:flex;justify-content:space-between;width:100%;align-items:center;height:32px;box-sizing:border-box}
                .vip-btn:hover{background:#252525;color:#00b4ff}
                .vip-btn.active{color:#00b4ff;background:#1e2a30}
                .vip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;padding:12px;min-height:150px;max-height:300px;overflow-y:auto;background:#0f0f0f;align-content:start;position:relative}
                .vip-grid::-webkit-scrollbar{width:12px}
                .vip-grid::-webkit-scrollbar-thumb{background:#00b4ff;border-radius:6px;border:3px solid #0f0f0f}
                .vip-item{position:relative;width:100%;aspect-ratio:1/1;background:#1a1a1a;cursor:pointer;border:2px solid transparent;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-drag:none;}
                .vip-item img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}
                .vip-item:hover{filter:grayscale(0);transform:translateY(-2px)}
                .vip-item.selected{border-color:#00b4ff;box-shadow:0 0 8px rgba(0,180,255,.4)}
                .vip-msg{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;font-size:14px;padding:60px 20px;text-align:center;font-weight:500;letter-spacing:1px;text-transform:uppercase}
                .vip-bar-wrapper{position:relative;display:flex;align-items:center;height:32px;background:#1a1a1a}
                .vip-multi-toggle{position:absolute;right:32px;top:5px;bottom:0;width:28px;background:none;border:none;color:#555;cursor:pointer;font-size:12px;transition:all .2s;z-index:10;display:flex;align-items:center;justify-content:center;padding:0}
                .vip-multi-toggle.active{color:#00b4ff;text-shadow:0 0 5px rgba(0,180,255,.5)}
                .vip-multi-toggle:hover{color:#eee}
                .vip-icon-span{display:flex;align-items:center;justify-content:center;width:20px;height:100%}
                .vip-modal-btn{position:absolute;top:5px;right:5px;height:30px;width:30px;background:#333;color:#fff;border-radius:3px;border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;z-index:10}
                .vip-modal-btn:hover{background:#00b4ff}
                .vip-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000}
                .vip-modal-box{width: 95%; height: 95%;background:#1a1a1a;padding:25px;border:2px solid #00b4ff;border-radius:10px;box-shadow:0 0 20px rgba(0,180,255,0.3);color:#fff;font-size:14px;font-weight:bold;display:flex;flex-direction:column;gap:15px}
                .vip-modal-grid-wrapper{ width: 100%; overflow-y: auto; border-top: 1px solid #333; padding-top: 10px; flex: 1; }
                .vip-modal-grid-wrapper::-webkit-scrollbar{width:12px}
                .vip-modal-grid-wrapper::-webkit-scrollbar-thumb{background:#00b4ff;border-radius:6px;border:3px solid #1a1a1a}
                .vip-modal-footer{display:flex; gap:10px; padding-top:10px; border-top:1px solid #333; justify-content: flex-end;}
                .vip-footer-btn{background:#2a2a2a; color:#aaa; border:1px solid #444; padding:8px 20px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; transition: all 0.2s;}
                .vip-footer-btn:hover{background:#333; color:#fff; border-color:#666;}
                .vip-footer-btn.active{background:#1e2a30; color:#00b4ff; border-color:#00b4ff; box-shadow: 0 0 8px rgba(0,180,255,0.2);}
                .vip-footer-btn.close-btn:hover{background:#442222; color:#ff4b4b; border-color:#ff4b4b;}
            `,
            parent: document.head,
        });
    },

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_NAME) return;

        const PLACEHOLDER_SRC = "/visual_picker/no-selection";
        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const imgWidget = node.widgets.find(w => w.name === "selected_image");
        const sortWidget = node.widgets.find(w => w.name === "sort_method");

        // Remove the placeholder STRING widget from Python — it's not a DOMWidgetImpl
        // and won't be rendered by the Vue DomWidget component in 1.43+
        const existingIdx = node.widgets.findIndex(w => w.name === "image_picker_ui");
        let uiStateValue = existingIdx >= 0 ? (node.widgets[existingIdx].value || "") : "";
        if (existingIdx >= 0) node.widgets.splice(existingIdx, 1);

        let domWidget = null;

        let multiSelectEnabled = false;
        const MOVE_THRESHOLD = 10;

        const previewImg = $el("img");
        const previewLab = $el("div.vip-overlay", { textContent: "No selection" });
        const thumbRow = $el("div.vip-thumb-row");
        const gridView = $el("div.vip-grid");

        const hoverPreview = $el("div", {
            style: {
                position: "fixed",
                display: "none",
                zIndex: 10001,
                pointerEvents: "none",
                border: "2px solid #00b4ff",
                borderRadius: "4px",
                backgroundColor: "transparent",
                boxShadow: "0 0 20px rgba(0,0,0,0.8)",
                // Use fit-content so the width collapses for portraits
                width: "fit-content",
                height: "fit-content",
                maxWidth: "500px",
                maxHeight: "500px",
                lineHeight: "0",
                overflow: "hidden"
            }
        }, [
            $el("img", {
                style: {
                    display: "block",
                    // Allow the image's natural aspect ratio to set the size
                    width: "auto",
                    height: "auto",
                    maxWidth: "500px",
                    maxHeight: "500px"
                }
            })
        ]);
        document.body.appendChild(hoverPreview);

        const showPreview = (src) => {
            const pImg = hoverPreview.querySelector("img");
            pImg.src = src;
            hoverPreview.style.display = "block";
        };

        const updateHoverPos = (e) => {
            const offset = 20;
            // Get the actual rendered size of the preview
            const rect = hoverPreview.getBoundingClientRect();
            
            let x = e.clientX + offset;
            let y = e.clientY + offset;

            // Boundary checks using the dynamic width/height
            if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - offset;
            if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - offset;

            hoverPreview.style.left = `${x}px`;
            hoverPreview.style.top = `${y}px`;
        };

        const openModal = async () => {
            if (!gridView.innerHTML || gridView.querySelector(".vip-msg")) {
                await node.loadImages();
            }

            const modalGrid = gridView.cloneNode(true);
            modalGrid.style.width = "100%";
            modalGrid.style.maxHeight = "100%";
            modalGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(180px, 1fr))";
            
            const modalTitle = $el("div", { textContent: "SELECT IMAGES" });

            const footerMultiBtn = $el("button.vip-footer-btn", { 
                textContent: multiSelectEnabled ? "MULTI-SELECT: ON" : "MULTI-SELECT: OFF",
                onclick: () => {
                    multiSelectEnabled = !multiSelectEnabled;
                    btnMulti.classList.toggle("active", multiSelectEnabled);
                    footerMultiBtn.classList.toggle("active", multiSelectEnabled);
                    footerMultiBtn.textContent = multiSelectEnabled ? "MULTI-SELECT: ON" : "MULTI-SELECT: OFF";
                }
            });

            if (multiSelectEnabled) footerMultiBtn.classList.add("active");

            const footerCloseBtn = $el("button.vip-footer-btn.close-btn", { 
                textContent: "CLOSE",
                onclick: () => modalOverlay.remove()
            });

            const syncModalHighlights = () => {
                const selections = getSelectedFiles();
                modalGrid.querySelectorAll(".vip-item").forEach(item => {
                    item.classList.toggle("selected", selections.includes(item._filename));
                });
                modalTitle.textContent = selections.length > 1 ? `${selections.length} FILES SELECTED` : (selections[0] || "NO SELECTION");
            };

            modalGrid.querySelectorAll(".vip-item").forEach((item, idx) => {
                const originalItems = gridView.querySelectorAll(".vip-item");
                const originalItem = originalItems[idx];
                item._filename = originalItem ? originalItem._filename : "";

                let pressTimer;
                let startX, startY;
                let holdFlag = false;

                const startPress = (e) => {
                    holdFlag = false;
                    const pos = e.touches ? e.touches[0] : e;
                    startX = pos.clientX;
                    startY = pos.clientY;

                    pressTimer = setTimeout(() => {
                        holdFlag = true;
                        if (!multiSelectEnabled) {
                            multiSelectEnabled = true;
                            btnMulti.classList.add("active");
                            footerMultiBtn.classList.add("active");
                            footerMultiBtn.textContent = "MULTI-SELECT: ON";
                        }
                        if (originalItem) originalItem.onclick(e);
                        syncModalHighlights();
                    }, 500);
                };

                const checkMove = (e) => {
                    if (!pressTimer) return;
                    const pos = e.touches ? e.touches[0] : e;
                    const dx = Math.abs(pos.clientX - startX);
                    const dy = Math.abs(pos.clientY - startY);
                    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                };

                const cancelPress = () => { clearTimeout(pressTimer); pressTimer = null; };

                item.onmousedown = startPress;
                item.ontouchstart = startPress;
                item.onmousemove = checkMove;
                item.ontouchmove = checkMove;
                item.onmouseup = cancelPress;
                item.ontouchend = cancelPress;
                item.onmouseleave = cancelPress;

                item.onclick = (e) => {
                    if (holdFlag) {
                        holdFlag = false;
                        return;
                    }
                    if (originalItem) originalItem.onclick(e);
                    if (!multiSelectEnabled && !e.ctrlKey && !e.metaKey) {
                        modalOverlay.remove();
                    } else {
                        syncModalHighlights();
                    }
                };

                item.addEventListener("mouseenter", () => {
                    const gridImg = item.querySelector("img");
                    if (gridImg && gridImg.src) {
                        showPreview(gridImg.src);
                    }
                });

                item.addEventListener("mousemove", updateHoverPos);

                item.addEventListener("mouseleave", () => {
                    hoverPreview.style.display = "none";
                    // Clear src so the old dimensions don't linger for the next hover
                    hoverPreview.querySelector("img").removeAttribute("src");
                });

            });

            const modalOverlay = $el("div.vip-modal-overlay", {
                onclick: (e) => { if(e.target === modalOverlay) modalOverlay.remove(); }
            }, [
                $el("div.vip-modal-box", [
                    modalTitle,
                    $el("div.vip-modal-grid-wrapper", [modalGrid]),
                    $el("div.vip-modal-footer", [footerMultiBtn, footerCloseBtn])
                ])
            ]);
            document.body.appendChild(modalOverlay);
            syncModalHighlights();
        };

        const modalBtn = $el("button.vip-modal-btn", { 
            textContent: "⛶",
            onclick: (e) => { e.stopPropagation(); openModal(); }
        });

        const previewColl = $el("div.vip-collapse", [
            $el("div.vip-preview-area", [
                $el("div.vip-preview", [modalBtn, previewImg, previewLab]),
                thumbRow
            ])
        ]);
        
        const btnPrev = $el("button.vip-btn", { 
            innerHTML: `<span>PREVIEW</span><span class="vip-icon-span">▲</span>` 
        });

        const gridColl = $el("div.vip-collapse", [gridView]);
        
        const btnMulti = $el("button.vip-multi-toggle", { 
            innerHTML: `⧉`,
            onclick: (e) => {
                e.stopPropagation();
                multiSelectEnabled = !multiSelectEnabled;
                btnMulti.classList.toggle("active", multiSelectEnabled);
            }
        });

        const btnGrid = $el("button.vip-btn", { 
            innerHTML: `<span>BROWSE COLLECTION</span><span class="vip-icon-span">☰</span>` 
        });
        const browseBar = $el("div.vip-bar-wrapper", [btnGrid, btnMulti]);

        const saveUiState = () => {
            uiStateValue = JSON.stringify({
                preview: previewColl.classList.contains("open"),
                grid: gridColl.classList.contains("open")
            });
        };

        let fitRafId;

        const getSelectedFiles = () => {
            const val = imgWidget?.value || "";
            return val ? val.split("|||") : [];
        };

        const fit = () => {
            container.style.height = "auto";
            if (!container.scrollHeight) return;
            node.setSize([node.size[0], node.computeSize()[1]]);
            (app.canvas ?? app.graph)?.setDirty?.(true, true);
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
                            t.appendChild($el("div.vip-thumb-more", { textContent: `+${selections.length - 5}` }));
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
            if (node._vip_watcher) { clearInterval(node._vip_watcher); node._vip_watcher = null; }
            if (node._vip_target_widget && node._vip_old_cb) {
                node._vip_target_widget.callback = node._vip_old_cb;
                node._vip_target_widget._vip_patched = false;
            }
            node._vip_target_widget = null;
        };

        node.onConnectionsChange = function (type, index, connected, link_info) {
            if (type === 1) {
                clearSync();
                if (connected && link_info) {
                    node._vip_conn_timeout = setTimeout(() => {
                        const link = app.graph.links[link_info.id];
                        if (!link) return;
                        const originNode = app.graph.getNodeById(link.origin_id);
                        if (!originNode?.widgets?.[0]) return;
                        const originWidget = originNode.widgets.find(w => w.name === "folder_path") || originNode.widgets[0];
                        node._vip_target_widget = originWidget;
                        node._vip_old_cb = originWidget.callback;
                        const sync = (newVal) => {
                            if (pathWidget && newVal && pathWidget.value !== newVal) {
                                pathWidget.value = newVal;
                                if (pathWidget.callback) pathWidget.callback(newVal);
                                if (node.loadImages && gridColl.classList.contains("open")) node.loadImages();
                            }
                        };
                        originWidget.callback = function() {
                            const res = node._vip_old_cb ? node._vip_old_cb.apply(this, arguments) : undefined;
                            sync(this.value);
                            return res;
                        };
                        node._vip_watcher = setInterval(() => sync(originWidget.value), 250);
                        sync(originWidget.value);
                    }, 300);
                }
            }
        };

        btnPrev.onclick = () => { previewColl.classList.toggle("open"); update(); animateFit(); saveUiState(); };
        btnGrid.onclick = () => {
            const open = gridColl.classList.toggle("open");
            btnGrid.querySelector("span:last-child").style.color = open ? '#00b4ff' : ''; 
            if (open && !gridView.innerHTML && pathWidget?.value) node.loadImages();
            animateFit();
            saveUiState();
        };

        if (pathWidget) {
            pathWidget.callback = () => {
                if (imgWidget) imgWidget.value = "";
                gridView.replaceChildren();
                if (gridColl.classList.contains("open")) node.loadImages();
                update(); fit();
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
                e.stopPropagation(); e.preventDefault();
                gridView.scrollTop += e.deltaY;
            }
        };
        window.addEventListener("wheel", handleWheel, { capture: true, passive: false });

        const container = $el("div.vip-container", [btnPrev, previewColl, browseBar, gridColl]);

        domWidget = node.addDOMWidget("image_picker_ui", "div", container, {
            getValue: () => uiStateValue,
            setValue: (v) => { uiStateValue = v; },
            getHeight: () => container.scrollHeight + 12,
        });

        node.loadImages = async () => {
            const path = pathWidget?.value;
            const sort = sortWidget?.value || "newest_first";
            if (!path) { gridView.innerHTML = `<div class="vip-msg"><span>⚠️</span><span>Empty path</span></div>`; return; }
            try {
                const res = await api.fetchApi("/visual_picker/images", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_path: path, sort_method: sort })
                });

                if (res.status === 404) {
                    gridView.innerHTML = `<div class="vip-msg"><span>📂</span><span>Path does not exist</span></div>`;
                    fit(); return;
                }
                if (!res.ok) throw new Error();

                const images = await res.json();
                const files = Object.keys(images);
                const currentSelections = getSelectedFiles();
                
                gridView.replaceChildren();
                if (files.length === 0) {
                    gridView.innerHTML = `<div class="vip-msg"><span>📷</span><span>No images found</span></div>`;
                    fit(); return;
                }

                files.forEach(f => {
                    const item = $el("div.vip-item", {
                        onclick: (e) => {
                            let selections = getSelectedFiles();
                            const isMulti = multiSelectEnabled || (e && (e.ctrlKey || e.metaKey));
                            if (isMulti) {
                                selections.includes(f) ? (selections = selections.filter(s => s !== f)) : selections.push(f);
                            } else {
                                selections = [f];
                            }
                            imgWidget.value = selections.join("|||"); 
                            if (imgWidget.callback) imgWidget.callback(imgWidget.value); 
                            gridView.querySelectorAll(".vip-item").forEach(i => i.classList.toggle("selected", selections.includes(i._filename)));
                            update(); animateFit();
                        }
                    }, [$el("img", { src: `/visual_picker/view?folder_path=${encodeURIComponent(path)}&filename=${encodeURIComponent(f)}` })]);
                    
                    item.addEventListener("mouseenter", () => {
                        const gridImg = item.querySelector("img");
                        if (gridImg && gridImg.src) {
                            showPreview(gridImg.src);
                        }
                    });

                    item.addEventListener("mousemove", updateHoverPos);

                    item.addEventListener("mouseleave", () => {
                        hoverPreview.style.display = "none";
                        // Clear src so the old dimensions don't linger for the next hover
                        hoverPreview.querySelector("img").removeAttribute("src");
                    });

                    item._filename = f;
                    let pressTimer;
                    let startX, startY;
                    let holdFlag = false;

                    const startPress = (e) => {
                        holdFlag = false;
                        const pos = e.touches ? e.touches[0] : e;
                        startX = pos.clientX;
                        startY = pos.clientY;
                        pressTimer = setTimeout(() => {
                            holdFlag = true;
                            if (!multiSelectEnabled) {
                                multiSelectEnabled = true;
                                btnMulti.classList.add("active");
                            }
                            item.onclick(e);
                        }, 500);
                    };

                    const checkMove = (e) => {
                        if (!pressTimer) return;
                        const pos = e.touches ? e.touches[0] : e;
                        const dx = Math.abs(pos.clientX - startX), dy = Math.abs(pos.clientY - startY);
                        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) { clearTimeout(pressTimer); pressTimer = null; }
                    };

                    const cancelPress = () => { clearTimeout(pressTimer); pressTimer = null; };

                    item.onmousedown = startPress;
                    item.ontouchstart = startPress;
                    item.onmousemove = checkMove;
                    item.ontouchmove = checkMove;
                    item.onmouseup = cancelPress;
                    item.ontouchend = cancelPress;
                    item.onmouseleave = cancelPress;

                    const originalOnclick = item.onclick;
                    item.onclick = (e) => {
                        if (holdFlag) { holdFlag = false; return; }
                        originalOnclick(e);
                    };

                    if (currentSelections.includes(f)) item.classList.add("selected");
                    gridView.appendChild(item);
                });
            } catch (e) {
                gridView.innerHTML = `<div class="vip-msg"><span>🚫</span><span>Access error</span></div>`;
            }
            fit();
        };

        node.onConfigure = function() {
            previewColl.style.transition = "none";
            gridColl.style.transition = "none";

            setTimeout(() => {
                if (uiStateValue) {
                    try {
                        const state = JSON.parse(uiStateValue);
                        previewColl.classList.toggle("open", !!state.preview);
                        gridColl.classList.toggle("open", !!state.grid);
                        btnGrid.querySelector("span:last-child").style.color = state.grid ? '#00b4ff' : '';
                    } catch (e) {}
                }
                
                update();
                if (pathWidget?.value && gridColl.classList.contains("open")) node.loadImages();
                
                void previewColl.offsetHeight; 
                previewColl.style.transition = "";
                gridColl.style.transition = "";
                
                animateFit();
            }, 100);
        };

        node.onRemoved = () => {
            cancelAnimationFrame(fitRafId);
            window.removeEventListener("wheel", handleWheel, { capture: true });
            if (node._vip_watcher) clearInterval(node._vip_watcher);
        };
        
        node.size = [350, 180];
        setTimeout(() => { update(); animateFit(); }, 100);
    }
});