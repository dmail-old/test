export const getResultStats = (results) => {
  const totalCount = results.length
  const skippedCount = results.filter(({ skipped }) => skipped).length
  const passedCount = results.filter(({ passed, skipped }) => passed && skipped === false).length
  const failedCount = results.filter(({ passed }) => passed === false).length

  return { totalCount, skippedCount, passedCount, failedCount }
}
