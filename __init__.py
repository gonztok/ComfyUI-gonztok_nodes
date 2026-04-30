__version__ = "1.0" 

WEB_DIRECTORY = "js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Visual Image Picker
try:
    from .visual_image_picker_node import VisualImagePicker
    NODE_CLASS_MAPPINGS["VisualImagePicker"] = VisualImagePicker
    NODE_DISPLAY_NAME_MAPPINGS["VisualImagePicker"] = "Visual Image Picker 📸"
except ImportError as e:
    print(f"Could not load visual_image_picker_node: {e}")

# Visual Folder Picker
try:
    from .visual_folder_picker_node import VisualFolderPicker
    NODE_CLASS_MAPPINGS["VisualFolderPicker"] = VisualFolderPicker
    NODE_DISPLAY_NAME_MAPPINGS["VisualFolderPicker"] = "Visual Folder Picker 📁"
except ImportError as e:
    print(f"Could not load visual_folder_picker_node: {e}")

# Visual Lora Picker
try:
    from .visual_lora_picker_node import VisualLoraPicker
    NODE_CLASS_MAPPINGS["VisualLoraPicker"] = VisualLoraPicker
    NODE_DISPLAY_NAME_MAPPINGS["VisualLoraPicker"] = "Visual Lora Picker 🎨"
except ImportError as e:
    print(f"Could not load visual_lora_picker_node: {e}")
