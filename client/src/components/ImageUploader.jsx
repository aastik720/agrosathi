import { Camera, CheckCircle2, FolderUp, ImagePlus, Leaf, RotateCcw } from "lucide-react";
import { formatBytes } from "../utils/imageCompressor.js";

const tips = [
  "Bimari wali jagah clear dikhe",
  "Achchi roshni mein photo lo",
  "Photo blur na ho",
  "Patti ko paas se lo",
];

const samples = [
  "linear-gradient(135deg, #dcfce7, #86efac)",
  "linear-gradient(135deg, #fef3c7, #bef264)",
  "linear-gradient(135deg, #e0f2fe, #bbf7d0)",
];

export default function ImageUploader({
  acceptedTypes,
  cameraInputRef,
  galleryInputRef,
  selectedImage,
  compressing,
  error,
  onCamera,
  onGallery,
  onInputChange,
  onAnalyze,
  onReset,
  analyzing,
}) {
  return (
    <div className="space-y-5">
      <input
        ref={cameraInputRef}
        className="hidden"
        type="file"
        accept={acceptedTypes}
        capture="environment"
        onChange={onInputChange}
      />
      <input
        ref={galleryInputRef}
        className="hidden"
        type="file"
        accept={acceptedTypes}
        onChange={onInputChange}
      />

      {!selectedImage ? (
        <UploadState
          compressing={compressing}
          error={error}
          onCamera={onCamera}
          onGallery={onGallery}
        />
      ) : (
        <PreviewState
          selectedImage={selectedImage}
          compressing={compressing}
          analyzing={analyzing}
          onAnalyze={onAnalyze}
          onReset={onReset}
        />
      )}
    </div>
  );
}

function UploadState({ compressing, error, onCamera, onGallery }) {
  return (
    <>
      <section className="rounded-lg border-2 border-dashed border-green-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-agro-green">
          <div className="relative">
            <Leaf size={54} aria-hidden="true" />
            <span className="absolute -bottom-2 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-agro-orange text-white">
              <Camera size={21} aria-hidden="true" />
            </span>
          </div>
        </div>

        <h2 className="mt-6 text-2xl font-extrabold text-slate-950">
          Fasal ki photo lo ya upload karo
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Patti, tana, ya phal ki photo</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className="primary-button w-full" type="button" onClick={onCamera}>
            <Camera size={21} aria-hidden="true" />
            Camera Se Lo
          </button>
          <button className="secondary-button w-full" type="button" onClick={onGallery}>
            <FolderUp size={21} aria-hidden="true" />
            Gallery Se Upload
          </button>
        </div>

        <p className="mt-4 text-xs font-bold text-slate-500">JPG, PNG, WebP supported</p>
        {compressing && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-agro-green">
            Image optimize ho rahi hai...
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-green-100 bg-white p-5 shadow-sm">
        <h3 className="font-extrabold text-slate-950">Acchi photo ke liye tips:</h3>
        <ul className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
          {tips.map((tip) => (
            <li key={tip} className="flex items-center gap-2">
              <CheckCircle2 size={17} className="shrink-0 text-agro-green" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-extrabold text-slate-700">Achchi photo ka example</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {samples.map((background, index) => (
            <div
              key={background}
              className="flex aspect-[4/3] items-center justify-center rounded-lg border border-green-100"
              style={{ background }}
            >
              <ImagePlus className="text-agro-green" size={26} aria-hidden="true" />
              <span className="sr-only">Sample photo {index + 1}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PreviewState({ selectedImage, compressing, analyzing, onAnalyze, onReset }) {
  return (
    <section className="rounded-lg border border-green-100 bg-white p-4 shadow-soft">
      <div className="relative overflow-hidden rounded-lg border-4 border-green-200 bg-green-50">
        <img
          className="max-h-[54vh] w-full object-contain"
          src={selectedImage.base64}
          alt="Selected crop"
        />
        <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-agro-green text-white shadow-soft">
          <CheckCircle2 size={22} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-green-50 p-4">
        <p className="text-sm font-extrabold text-slate-950">{selectedImage.fileName}</p>
        <p className="mt-1 text-sm font-semibold text-agro-green">
          {selectedImage.compressionText}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          Ready: {formatBytes(selectedImage.compressedSize)}
        </p>
      </div>

      {compressing && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-agro-green">
          Image optimize ho rahi hai...
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.7fr]">
        <button className="secondary-button w-full" type="button" onClick={onReset} disabled={analyzing}>
          <RotateCcw size={20} aria-hidden="true" />
          Dobara chunein
        </button>
        <button className="primary-button w-full" type="button" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? <span className="spinner" /> : <Leaf size={20} aria-hidden="true" />}
          {analyzing ? "Bimari check ho rahi hai..." : "Bimari Pakdo"}
        </button>
      </div>
    </section>
  );
}
