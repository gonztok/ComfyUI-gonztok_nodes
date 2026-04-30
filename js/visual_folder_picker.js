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
            .vfp-grid { display:flex; flex-direction:column; gap:0px; padding:0px; max-height:300px; overflow-y:auto; background:#0f0f0f; transition: max-height 0.3s ease-in-out; }
            .vfp-container.is-collapsed .vfp-grid { max-height: 0px; display: none; }                
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

        const gridView = $el("div.vfp-grid");
        const pathDisplay = $el("div.vfp-path-display", { textContent: pathWidget.value });
        
        const container = $el("div.vfp-container.is-collapsed", [
            $el("div.vfp-header", {
                onclick: () => {
                    const isCollapsed = container.classList.toggle("is-collapsed");
                    node.properties["isCollapsed"] = isCollapsed;
                    node.setSize([node.size[0], isCollapsed ? 100 : 400]);
                }
            }, [pathDisplay]),
            gridView
        ]);

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

        node.addDOMWidget("folderpicker_ui", "div", container);

        node.loadFolders = async () => {
            pathDisplay.textContent = pathWidget.value;
            try {
                const res = await api.fetchApi("/visual_picker/folders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_path: pathWidget.value })
                });
                const data = await res.json();
                
                while (gridView.firstChild) {
                    gridView.removeChild(gridView.firstChild);
                }

                const upItem = $el("div.vfp-item.up-dir", {
                    textContent: ".. [PARENT DIRECTORY]",
                    onclick: () => {
                        folderWidget.value = ""; 
                        gridView.querySelectorAll(".vfp-item").forEach(i => i.classList.remove("selected"));
                        upItem.classList.add("selected");
                    },
                    ondblclick: (e) => {
                        e.preventDefault();
                        let path = pathWidget.value.replace(/[\\/]$/, "");
                        const lastIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
                        if (lastIndex !== -1) {
                            pathWidget.value = path.substring(0, lastIndex) || (path.startsWith("/") ? "/" : path.substring(0, lastIndex));
                            folderWidget.value = "";
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
                                folderWidget.value = f;
                                gridView.querySelectorAll(".vfp-item").forEach(i => i.classList.remove("selected"));
                                item.classList.add("selected");
                            },
                            ondblclick: (e) => {
                                e.preventDefault();
                                const sep = pathWidget.value.includes("\\") ? "\\" : "/";
                                pathWidget.value = pathWidget.value.replace(/[\\/]$/, "") + sep + f;
                                folderWidget.value = "";
                                node.loadFolders();
                            }
                        });
                        if (folderWidget.value === f) item.classList.add("selected");
                        gridView.appendChild(item);
                    });
                }
            } catch (e) { 
                gridView.innerHTML = `<div style="color:red;padding:10px;">Error</div>`; 
            }
        };

        const origOnConfigure = node.onConfigure;
        node.onConfigure = function() {
            if (origOnConfigure) origOnConfigure.apply(this, arguments);
            
            const shouldBeCollapsed = node.properties["isCollapsed"] !== false; 
            container.classList.toggle("is-collapsed", shouldBeCollapsed);
            
            this.setSize([this.size[0], shouldBeCollapsed ? 100 : 400]);
            this.loadFolders();
        };

        pathWidget.callback = () => node.loadFolders();

        const origOnRemoved = node.onRemoved;
        node.onRemoved = () => {
            if (origOnRemoved) origOnRemoved.apply(node);
            scrollController.abort();
            pathWidget.callback = null;
            node.loadFolders = null;
        };
        
        node.size = [350, 100];
        node.properties = node.properties || {};
        if (node.properties["isCollapsed"] === undefined) node.properties["isCollapsed"] = true;

        setTimeout(() => {
            if (node.loadFolders) node.loadFolders();
        }, 100);
    }
});