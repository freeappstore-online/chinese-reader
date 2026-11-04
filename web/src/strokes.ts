type StrokeData = { strokes: string[]; medians: number[][][] }
const packs = new Map<number, Promise<Record<string, StrokeData>>>()
export async function loadStrokes(char: string): Promise<StrokeData> {
  const shard = char.codePointAt(0)! % 32
  let pending = packs.get(shard)
  if (!pending) {
    pending = (async () => {
      const response = await fetch(`/strokes/v2/${shard.toString(16).padStart(2, '0')}.bin`)
      if (!response.ok || !response.body) throw new Error('Stroke pack unavailable')
      return await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json()
    })().catch(error => { packs.delete(shard); throw error })
    // Bound decoded data in memory; all compressed packs stay available offline.
    if (packs.size >= 3) packs.delete(packs.keys().next().value!)
    packs.set(shard, pending)
  }
  const data = (await pending)[char]
  if (!data?.strokes?.length) throw new Error('Character absent from the stroke dataset')
  return data
}
