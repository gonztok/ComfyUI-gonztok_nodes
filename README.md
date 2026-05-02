# ComfyUI-gonztok_nodes
# 🎨 ComfyUI Visual Picker Suite

A set of custom nodes for **ComfyUI** designed to replace clunky text inputs with a high-performance, visual interface for selecting directories, images, and LoRAs. I made these with the objective of enhancing App Mode experience.
---

## 🛠️ The Node Trio

### 📂 Visual Folder Picker
The navigation hub of your workflow.
*   **Core Logic**: `visual_folder_picker_node.py`
*   **Interface**: `visual_folder_picker.js`
*   **Fluid Navigation**: Deep-dive into subdirectories with a double-click and jump back to parent folders instantly.
*   **Dual Outputs**: Provides both the absolute `full_path` and the specific `folder_name`.   


Workflow mode | App mode
--- | ---
<img width="500" alt="image" src="https://github.com/user-attachments/assets/52f1266c-d6f5-453d-b147-61039da8356b" /> | <img width="150" alt="image" src="https://github.com/user-attachments/assets/79beac6c-be00-443d-b3ce-55bad1d3de85" />

### 🖼️ Visual Image Picker
A premium gallery for asset selection. Multiselection is enabled using a small toggle, or you can hold CTRL while clicking on the images.
*   **Core Logic**: `visual_image_picker_node.py`
*   **Interface**: `visual_image_picker.js`
*   **Interactive Grid**: Features a high-speed image grid with custom sorting (Newest, Oldest, Name, etc.).
*   **Adaptive Preview**: Includes a collapsible, high-resolution preview window that auto-scales to your selection.



Workflow mode | App mode
--- | ---
<img width="500" alt="image" src="https://github.com/user-attachments/assets/21186370-cdd5-4e47-a685-e675b8cf244c" /> | <img width="150" alt="image" src="https://github.com/user-attachments/assets/5f568381-af03-46f3-93e7-1bdbd44d53b9" />


### 🧬 Visual LoRA Picker
Visual cataloging for your model library.
*   **Core Logic**: `visual_lora_picker_node.py`
*   **Interface**: `visual_lora_picker.js`
*   **Preview Detection**: Automatically pairs `.safetensors` with `.webp` previews to give you a visual catalog of your styles.
*   **Clean UI**: Replaces massive dropdown lists with a searchable, visual grid.



Workflow mode | App mode
--- | ---
<img width="500" alt="image" src="https://github.com/user-attachments/assets/c72b9102-b33a-465b-9085-c64d4a096826" /> | <img width="150" alt="image" src="https://github.com/user-attachments/assets/db77d8e6-a73f-4c6d-8583-2d85465f2bc6" />

---

## 🔗 Dynamic Synergy (Master & Slave Logic)
The true power of this suite lies in how the nodes communicate.

*   **Folder-to-Picker Linking**: Connect the `full_path` from the **Visual Folder Picker** to the `opt_folder_path` of the Image or LoRA pickers to create a unified browser.
*   **Real-time Watcher**: The Javascript backend uses an active watcher to poll for path changes every 250ms, ensuring that as you browse folders, your gallery updates in real-time.
*   **Sophisticated Toggling**: All UI elements are collapsible, allowing you to maintain a minimal workspace without sacrificing utility.





Workflow mode | App mode
--- | ---
<img width="500" alt="image" src="https://github.com/user-attachments/assets/86a9b0d5-0439-40a3-9776-fd9e5a805d57" /> | <img width="150" alt="image" src="https://github.com/user-attachments/assets/f9fbb105-73df-480e-98f5-f646edf7a802" />

---

## 🚀 Installation

### 1. Manual Clone
Navigate to your ComfyUI custom nodes directory and clone the repository:
```bash
cd ComfyUI/custom_nodes/
git clone https://github.com/gonztok/ComfyUI-gonztok_nodes.git
