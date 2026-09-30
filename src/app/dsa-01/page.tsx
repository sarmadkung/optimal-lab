import type { Metadata } from "next";
import TwoSumDemo from "./TwoSumDemo";

export const metadata: Metadata = {
  title: "Two Sum, three ways",
  description:
    "Interactive demo for DSA #01: step through brute force, sort + two pointers and a hash map, then watch how each one scales.",
};

export default function Page() {
  return <TwoSumDemo />;
}
