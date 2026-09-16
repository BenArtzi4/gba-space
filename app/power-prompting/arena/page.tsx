import type { Metadata } from "next";
import Arena from "../_components/Arena";

export const metadata: Metadata = {
  title: "Arena · Power Prompting",
};

export default function ArenaPage() {
  return <Arena />;
}
