import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "VisualFolderPicker";

const styleId = "vfp-extension-styles";
if (!document.getElementById(styleId)) {
    $el("style", {
        id: styleId,
        textContent: `
            .vfp-container { display:flex; flex-direction:column; background:#111; border:1px solid #333; border-radius:8px; overflow:hidden; margin-top: 5px; }
            .vfp-header { background:#1a1a1a; padding:8px; border-bottom:1px solid #333; text-align:center; cursor:pointer; transition: background 0.2s; }
            .vfp-header:hover { background: #222; }
            .vfp-path-display { font-size:10px; color:#00b4ff; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight: bold; }
            .vfp-collapse { overflow:hidden; transition: all .4s cubic-bezier(.25,1,.5,1); max-height:0; opacity:0; }
            .vfp-collapse.open { max-height:800px; opacity:1; }
            .vfp-grid { display:flex; flex-direction:column; gap:0px; padding:0px; max-height:300px; overflow-y:auto; background:#0f0f0f; }
            .vfp-grid::-webkit-scrollbar{width:12px}
            .vfp-grid::-webkit-scrollbar-thumb{background:#00b4ff;border-radius:6px;border:3px solid #0f0f0f}
            .vfp-item { padding:10px 15px; background:#1a1a1a; cursor:pointer; color:#ccc; font-family:monospace; font-size:11px; display:flex; align-items:center; user-select:none; border-bottom:1px solid #222; }
            .vfp-item:hover { background:#252525; color:#00b4ff; }
            .vfp-item.selected { background:#004466; color:#fff; border-left:4px solid #00b4ff; padding-left:11px; }
            .vfp-item::before { content:"📁"; margin-right:10px; width:16px; display:inline-block; text-align:center; flex-shrink:0; }
            .vfp-item.up-dir { color:#ffcc00; font-weight:bold; background:#161616; }
            .vfp-item.up-dir::before { content:"⤴️"; }
            .vfp-item img { display: none !important; }
            .vfp-item:last-child { border-bottom: none; }
        `,
        parent: document.head,
    });
}

app.registerExtension({
    name: "visual_picker.FolderPicker",

    async nodeCreated(node) {
        if (node.comfyClass !== NODE_NAME) return;

        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const folderWidget = node.widgets.find(w => w.name === "selected_folder");

        // Remove the placeholder STRING widget from Python — it's not a DOMWidgetImpl
        // and won't be rendered by the Vue DomWidget component in 1.43+
        const existingIdx = node.widgets.findIndex(w => w.name === "folder_picker_ui");
        let uiStateValue = existingIdx >= 0 ? (node.widgets[existingIdx].value || "") : "";
        if (existingIdx >= 0) node.widgets.splice(existingIdx, 1);

        let domWidget = null;

        const gridView = $el("div.vfp-grid");
        const pathDisplay = $el("div.vfp-path-display", { textContent: pathWidget?.value || "" });
        const gridColl = $el("div.vfp-collapse", [gridView]);
        
        const container = $el("div.vfp-container", [
            $el("div.vfp-header", {
                onclick: () => {
                    gridColl.classList.toggle("open");
                    saveUiState();
                    animateFit();
                }
            }, [pathDisplay]),
            gridColl
        ]);

        const saveUiState = () => {
            uiStateValue = JSON.stringify({
                grid: gridColl.classList.contains("open")
            });
        };

        const fit = () => {
            if (!domWidget) return;
            container.style.height = "auto";
            const h = container.scrollHeight;
            if (!h) return;
            container.style.setProperty("--comfy-widget-height", h + "px");
            node.setSize([node.size[0], h]);
            (app.canvas ?? app.graph)?.setDirty?.(true, true);
        };

        const animateFit = (duration = 420) => {
            const end = performance.now() + duration;
            const tick = (now) => {
                fit();
                if (now < end) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        const scrollController = new AbortController();
        window.addEventListener("wheel", (e) => {
            if (gridView.contains(e.target)) {
                e.stopPropagation();
                gridView.scrollTop += e.deltaY;
                e.preventDefault();
            }
        }, { 
            capture: true, 
            passive: false, 
            signal: scrollController.signal 
        });

        domWidget = node.addDOMWidget("folder_picker_ui", "div", container, {
            getValue: () => uiStateValue,
            setValue: (v) => { uiStateValue = v; },
        });

        node.loadFolders = async () => {
            if (!pathWidget) return;
            pathDisplay.textContent = pathWidget.value;
            try {
                const res = await api.fetchApi("/visual_picker/folders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_path: pathWidget.value })
                });
                const data = await res.json();
                
                gridView.replaceChildren();

                const upItem = $el("div.vfp-item.up-dir", {
                    textContent: ".. [PARENT DIRECTORY]",
                    onclick: () => {
                        if (folderWidget) folderWidget.value = ""; 
                        gridView.querySelectorAll(".vfp-item").forEach(i => i.classList.remove("selected"));
                        upItem.classList.add("selected");
                    },
                    ondblclick: (e) => {
                        e.preventDefault();
                        let path = pathWidget.value.replace(/[\\/]$/, "");
                        const lastIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
                        if (lastIndex !== -1) {
                            pathWidget.value = path.substring(0, lastIndex) || (path.startsWith("/") ? "/" : path.substring(0, lastIndex));
                            if (folderWidget) folderWidget.value = "";
                            node.loadFolders();
                        }
                    }
                });
                gridView.appendChild(upItem);

                if (data.folders) {
                    data.folders.forEach(f => {
                        const item = $el("div.vfp-item", {
                            textContent: f,
                            onclick: () => {
                                if (folderWidget) folderWidget.value = f;
                                gridView.querySelectorAll(".vfp-item").forEach(i => i.classList.remove("selected"));
                                item.classList.add("selected");
                            },
                            ondblclick: (e) => {
                                e.preventDefault();
                                const sep = pathWidget.value.includes("\\") ? "\\" : "/";
                                pathWidget.value = pathWidget.value.replace(/[\\/]$/, "") + sep + f;
                                if (folderWidget) folderWidget.value = "";
                                node.loadFolders();
                            }
                        });
                        if (folderWidget && folderWidget.value === f) item.classList.add("selected");
                        gridView.appendChild(item);
                    });
                }
            } catch (e) { 
                gridView.innerHTML = `<div style="color:red;padding:10px;">Error</div>`; 
            }
            fit();
        };

        node.onConfigure = function() {
            gridColl.style.transition = "none";
            setTimeout(() => {
                if (uiStateValue) {
                    try {
                        const state = JSON.parse(uiStateValue);
                        gridColl.classList.toggle("open", !!state.grid);
                    } catch (e) {}
                }
                this.loadFolders();
                void gridColl.offsetHeight;
                gridColl.style.transition = "";
                animateFit();
            }, 100);
        };

        if (pathWidget) pathWidget.callback = () => node.loadFolders();

        const origOnRemoved = node.onRemoved;
        node.onRemoved = () => {
            if (origOnRemoved) origOnRemoved.apply(node);
            scrollController.abort();
            if (pathWidget) pathWidget.callback = null;
            node.loadFolders = null;
        };
        
        node.size = [350, 100];
        setTimeout(() => {
            if (node.loadFolders) node.loadFolders();
            animateFit();
        }, 100);
    }
});