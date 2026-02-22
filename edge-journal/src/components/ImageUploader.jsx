export default function ImageUploader({ image, onUpload, onRemove }) {
  return image ? (
    <div>
      <img src={image} alt="Journal upload" style={{ maxWidth: 260, borderRadius: 8 }} />
      <div><button type="button" onClick={onRemove}>Remove</button></div>
    </div>
  ) : (
    <label style={{ border: "1px dashed var(--border2)", display: "inline-block", padding: 16, cursor: "pointer" }}>
      Add Image
      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(e.target.files?.[0])} />
    </label>
  );
}
