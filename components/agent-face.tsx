import { cn } from "@/lib/utils"

/**
 * One sprite sheet, 3 columns x 5 rows of 256px cells.
 *
 * 256px is the artwork's native crop — the source cells measure 269-288px, so
 * anything larger is upscaling. On a 2x display that puts a hard ceiling of
 * ~128px on how big this can be drawn before it visibly softens.
 */
const SHEET_COLS = 3
const SHEET_ROWS = 5

export const POSES = {
  greet: [0, 0],
  calm: [1, 0],
  idea: [2, 0],
  working: [0, 1],
  thinking: [1, 1],
  caution: [2, 1],
  oops: [0, 2],
  awkward: [1, 2],
  alert: [2, 2],
  cheer: [0, 3],
  sheepish: [1, 3],
  proud: [2, 3],
  hello: [0, 4],
  neutral: [1, 4],
  focus: [2, 4],
} as const

export type Pose = keyof typeof POSES

export const MAX_CRISP_SIZE = 128

export function AgentFace({
  pose,
  size = 56,
  className,
}: {
  pose: Pose
  size?: number
  className?: string
}) {
  const [col, row] = POSES[pose]
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 bg-no-repeat", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/agent-sprite.png)",
        backgroundSize: `${size * SHEET_COLS}px ${size * SHEET_ROWS}px`,
        backgroundPosition: `-${col * size}px -${row * size}px`,
      }}
    />
  )
}

/** The portrait as it appears outside the admin: paper ground, ink ring. */
export function AgentPortrait({
  pose,
  size = 96,
  className,
}: {
  pose: Pose
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary/30 bg-gradient-to-b from-white to-secondary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <AgentFace pose={pose} size={size} />
    </span>
  )
}
