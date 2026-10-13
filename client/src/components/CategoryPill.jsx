import { motion } from "motion/react"

// Split into its own chunk: the motion library is ~37 kB gzipped and is needed
// only once the reader switches category, so BlogList loads it lazily behind a
// visually identical static fallback.
const CategoryPill = () => (
  <motion.span
    layoutId="category-pill"
    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
    className="absolute inset-0 -z-10 rounded-full bg-tealsolid"
  />
)

export default CategoryPill
