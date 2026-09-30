import type { Metadata } from "next";
import NextTokenDemo from "./NextTokenDemo";

export const metadata: Metadata = {
  title: "How an LLM picks the next token",
  description:
    "Interactive demo: logits, softmax, temperature, top-k, top-p and sampling, on one real-looking example.",
};

export default function Page() {
  return <NextTokenDemo />;
}
