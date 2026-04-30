# ComfyUI-gonztok_nodes
# 🎨 ComfyUI Visual Picker Suite

A set of custom nodes for **ComfyUI** designed to replace clunky text inputs with a high-performance, visual interface for managing directories, images, and LoRAs. I made these with the objective of enhance App Mode experience, and they have only been tested on Nodes 2.0.

---

## 🛠️ The Node Trio

### 📂 Visual Folder Picker
The navigation hub of your workflow[cite: 1].
*   **Core Logic**: `visual_folder_picker_node.py`[cite: 1]
*   **Interface**: `visual_folder_picker.js`[cite: 4]
*   **Fluid Navigation**: Deep-dive into subdirectories with a double-click and jump back to parent folders instantly[cite: 4].
*   **Dual Outputs**: Provides both the absolute `full_path` and the specific `folder_name`[cite: 1].
<img width="748" height="528" alt="image" src="https://github.com/user-attachments/assets/52f1266c-d6f5-453d-b147-61039da8356b" />
<img width="308" height="745" alt="image" src="https://github.com/user-attachments/assets/79beac6c-be00-443d-b3ce-55bad1d3de85" />


### 🖼️ Visual Image Picker
A premium gallery for asset selection.
*   **Core Logic**: `visual_image_picker_node.py`[cite: 2]
*   **Interface**: `visual_image_picker.js`[cite: 5]
*   **Interactive Grid**: Features a high-speed image grid with custom sorting (Newest, Oldest, Name, etc.)[cite: 2, 5].
*   **Adaptive Preview**: Includes a collapsible, high-resolution preview window that auto-scales to your selection[cite: 5].
<img width="1022" height="1011" alt="image" src="https://github.com/user-attachments/assets/f1a57641-956e-4fae-927c-2885720698ea" />
<img width="309" height="873" alt="image" src="https://github.com/user-attachments/assets/3a592e0a-9c6f-4158-a70b-1493788ff77f" />

### 🧬 Visual LoRA Picker
Visual cataloging for your model library[cite: 3].
*   **Core Logic**: `visual_lora_picker_node.py`[cite: 3]
*   **Interface**: `visual_lora_picker.js`[cite: 6]
*   **Preview Detection**: Automatically pairs `.safetensors` with `.webp` previews to give you a visual catalog of your styles[cite: 3, 6].
*   **Clean UI**: Replaces massive dropdown lists with a searchable, visual grid[cite: 6].
<img width="876" height="933" alt="image" src="https://github.com/user-attachments/assets/2a57b042-ecee-4fbf-94d4-0290a7d9c62d" />
<img width="311" height="886" alt="image" src="https://github.com/user-attachments/assets/f115cd13-2c05-4eb1-9835-1db073e73298" />


---

## 🔗 Dynamic Synergy (Master & Slave Logic)
The true power of this suite lies in how the nodes communicate[cite: 5, 6].

*   **Folder-to-Picker Linking**: Connect the `full_path` from the **Visual Folder Picker** to the `opt_folder_path` of the Image or LoRA pickers to create a unified browser[cite: 1, 5, 6].
*   **Real-time Watcher**: The Javascript backend uses an active watcher to poll for path changes every 250ms, ensuring that as you browse folders, your gallery updates in real-time[cite: 5, 6].
*   **Sophisticated Toggling**: All UI elements are collapsible, allowing you to maintain a minimal workspace without sacrificing utility.

<img width="1217" height="956" alt="image" src="https://github.com/user-attachments/assets/d8039e60-d63c-4562-872a-30ec6547bcbc" />
<img width="1255" height="958" alt="image" src="https://github.com/user-attachments/assets/39dff49c-c42d-4f19-aec6-d2e696639fe1" />
<img width="453" height="1237" alt="image" src="https://github.com/user-attachments/assets/f9fbb105-73df-480e-98f5-f646edf7a802" />

---

## 🚀 Installation

### 1. Manual Clone
Navigate to your ComfyUI custom nodes directory and clone the repository:
```bash
cd ComfyUI/custom_nodes/
git clone [https://github.com/gonztok/ComfyUI-gonztok_nodes.git](https://github.com/gonztok/ComfyUI-gonztok_nodes.git)
