import { useCallback, useRef, useState } from "react";
import { compressImage } from "../utils/imageCompressor.js";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export default function useImageCapture() {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");

  const resetInputs = useCallback(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, []);

  const resetImage = useCallback(() => {
    setSelectedImage(null);
    setError("");
    resetInputs();
  }, [resetInputs]);

  const handleFile = useCallback(async (file) => {
    if (!file) return null;

    setError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Sirf JPG, PNG, ya WebP photo chunein.");
      return null;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setError("File bahut badi hai. 10MB se kam ki photo chunein");
      return null;
    }

    try {
      setCompressing(true);
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      return compressed;
    } catch {
      setError("Photo optimize nahi ho paayi. Dusri photo try karein.");
      return null;
    } finally {
      setCompressing(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const openGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  return {
    acceptedTypes: ACCEPTED_TYPES.join(","),
    cameraInputRef,
    galleryInputRef,
    selectedImage,
    compressing,
    error,
    setError,
    openCamera,
    openGallery,
    handleInputChange,
    handleFile,
    resetImage,
  };
}
