"use client";
import { motion, useReducedMotion } from "motion/react";

type Props = {
  as?: "article" | "li";
  index?: number;
  className?: string;
  children: React.ReactNode;
};

// Card that rises into view on scroll and lifts slightly on hover (Framer Motion).
// Respects "reduce motion": then it simply appears, with no movement.
export default function AnimatedCard({ as = "article", index = 0, className, children }: Props) {
  const reduce = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.article;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26, scale: 0.98 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
    >
      {children}
    </Tag>
  );
}
