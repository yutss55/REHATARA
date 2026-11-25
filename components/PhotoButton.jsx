"use client";
import { useRef } from "react";

export default function PhotoButton({ action, className }) {
  const form = useRef(null);
  const input = useRef(null);
  return (
    <form ref={form} action={action}>
      <input ref={input} type="file" name="photo" accept="image/png,image/jpeg,image/webp" hidden
        onChange={() => input.current.files.length && form.current.requestSubmit()} />
      <button type="button" className={className} onClick={() => input.current.click()}>Ganti foto</button>
    </form>
  );
}