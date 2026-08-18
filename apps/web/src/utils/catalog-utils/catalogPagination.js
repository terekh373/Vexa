export const getItemsPerPage = () => {
  const availableHeight = window.innerHeight - 450

  const cardHeight = 328
  const gap = 24

  const rows = Math.max(
    1,
    Math.floor(
      (availableHeight + gap) / (cardHeight + gap)
    )
  )

  return rows * 4
}