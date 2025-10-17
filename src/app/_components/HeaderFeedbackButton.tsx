"use client";

import { useState } from "react";
import FeedbackDialog from "./FeedbackDialog";

export default function HeaderFeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-secondary hover-lift px-3 py-2 text-sm" onClick={() => setOpen(true)}>Góp ý</button>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
