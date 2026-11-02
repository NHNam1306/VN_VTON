import type { GarmentPromptInfo, TryOnAngle } from '../providers/image-provider.js'

const angleDescriptions: Record<TryOnAngle, string> = {
  front: 'front view facing the camera',
  back: 'back view, seen from behind',
}

function getPlacementDirective(name: string, category: string): string {
  const lower = name.toLowerCase()
  if (category === 'tops') {
    return 'worn on the upper body/torso as an inner top'
  }
  if (category === 'outerwear') {
    return 'worn over the top as an outerwear layer (jacket/coat/cardigan)'
  }
  if (category === 'bottoms') {
    return 'worn on the lower body (pants/skirt/shorts)'
  }
  if (category === 'shoes') {
    return 'worn on both feet (shoes/sneakers/boots/loafers)'
  }

  // Accessories: smart anatomical placement inference based on item name
  if (lower.includes('đồng hồ') || lower.includes('watch') || lower.includes('vòng tay') || lower.includes('bracelet')) {
    return 'worn naturally on the person’s wrist/arm'
  }
  if (lower.includes('kính') || lower.includes('glasses') || lower.includes('sunglasses')) {
    return 'worn properly over the eyes/face or resting stylishly on the face'
  }
  if (lower.includes('mũ') || lower.includes('nón') || lower.includes('hat') || lower.includes('cap') || lower.includes('beanie') || lower.includes('beret')) {
    return 'worn securely on the head'
  }
  if (lower.includes('túi') || lower.includes('bag') || lower.includes('purse') || lower.includes('tote') || lower.includes('clutch') || lower.includes('balo') || lower.includes('backpack')) {
    if (lower.includes('đeo vai') || lower.includes('shoulder')) {
      return 'slung gracefully over the person’s shoulder or held by its strap'
    }
    if (lower.includes('chéo') || lower.includes('crossbody')) {
      return 'worn across the body with the strap resting diagonally across the chest'
    }
    if (lower.includes('cầm tay') || lower.includes('clutch') || lower.includes('xách') || lower.includes('túi đ')) {
      return 'held naturally in the person’s hand or forearm matching the hand pose in IMAGE 1'
    }
    return 'held in the hand or slung naturally over the shoulder/arm matching the model’s hand posture'
  }
  if (lower.includes('khăn') || lower.includes('scarf') || lower.includes('bandana') || lower.includes('cà vạt') || lower.includes('tie')) {
    return 'tied or draped stylishly around the neck/collar'
  }
  if (lower.includes('thắt lưng') || lower.includes('dây lưng') || lower.includes('belt')) {
    return 'fastened around the waistline of the bottoms through belt loops'
  }
  if (lower.includes('vòng cổ') || lower.includes('dây chuyền') || lower.includes('necklace')) {
    return 'worn around the neck, resting gracefully on the collarbone/chest'
  }
  if (lower.includes('hoa tai') || lower.includes('khuyên tai') || lower.includes('earring')) {
    return 'worn on the earlobes'
  }
  if (lower.includes('nhẫn') || lower.includes('ring')) {
    return 'worn on the fingers'
  }
  if (lower.includes('tất') || lower.includes('vớ') || lower.includes('socks')) {
    return 'worn on the feet/ankles under the footwear'
  }

  return 'worn or held in its natural anatomical position matching its name and shape'
}

type TryOnPromptInput = {
  angle: TryOnAngle
  garmentCount: number
  hasReferenceImage: boolean
  garments?: GarmentPromptInfo[]
  preservePose?: boolean
}

export function buildTryOnPrompt({
  angle,
  garmentCount,
  hasReferenceImage,
  garments,
  preservePose = true,
}: TryOnPromptInput): string {
  const backInstruction = angle === 'back'
    ? 'Some garment references may show the back of the item. Treat those as authoritative for rear colors, logos, patterns, seams, and cut.'
    : ''
  const layeringInstruction = 'The garment references are ordered by dressing layer: inner top first, then outerwear, then bottoms, shoes, and accessories. When both an inner top and outerwear are supplied, keep them as two distinct garments: wear the inner top underneath and the outerwear over it. Keep the outerwear open whenever needed so the inner top remains visibly identifiable.'

  const garmentDetails = garments && garments.length > 0
    ? `SPECIFIC GARMENTS & ACCESSORIES TO WEAR (numbered matching garment references):
${garments.map((g, idx) => `- Garment Reference ${idx + 1}: "${g.name}" (${g.category}) -> Must be ${getPlacementDirective(g.name, g.category)}.`).join('\n')}

ACCESSORY ANATOMICAL PLACEMENT RULES:
- Position every accessory in its natural, intended anatomical location matching its name (wristwatches on wrists, bags held or slung properly, eyewear on the face, hats on the head, necklaces on the neck).
- Do NOT merge accessories into clothing fabrics or misplace them.`
    : ''

  // KHI TẠO ẢNH GÓC SAU VÀ ĐÃ CÓ ẢNH GÓC TRƯỚC:
  // Lấy trực tiếp IMAGE 1 (ảnh góc trước đã hoàn thiện trong studio) làm chuẩn gốc 100%
  if (angle === 'back' && hasReferenceImage) {
    const rearPoseDirectives = preservePose
      ? `- STRICT POSE PRESERVATION: Faithfully mirror the person's exact lower body stance, leg pose, hip angle, and posture from IMAGE 1 (the FRONT VIEW), viewed from behind (180-degree rotation). If one leg is bent or raised backwards in IMAGE 1, preserve that exact leg pose viewed from behind!
- HANDS & ARMS: In IMAGE 1, the hands/arms and any held items (such as a smartphone or drink) were positioned in front of the person's chest. When rotated 180 degrees to this rear view, those hands, arms, and held items remain naturally in front of the body and are HIDDEN/OBSCURED from the camera by the torso. DO NOT draw any phone, drink, or hands raised behind the person's head, neck, or back!
- CLEAN REAR VIEW: The back of the hair, neck, shoulders, shirt/top, waistband, and shorts/pants must be completely clean, natural, and visible without obstruction.`
      : `- POSE: Generate a natural, stylish fashion model pose viewed from behind, showcasing the back of the outfit.`

    return `IMAGE 1 is the front view of this person wearing the outfit in a studio. Generate the direct back view (180-degree rear view, seen from behind, facing away from the camera) of the EXACT SAME person and outfit shown in IMAGE 1.

PRIMARY CONSISTENCY DIRECTIVES (MATCH IMAGE 1):
- View: back view, seen from behind (facing away from the camera).
- The subject is the EXACT person in IMAGE 1: match the hair color, hair length, wavy hairstyle texture, skin tone, body shape, height, and proportions from IMAGE 1.
- The outfit must MATCH IMAGE 1 EXACTLY: reproduce the exact clothing items and accessories worn in IMAGE 1 as seen from behind (back of the top, back pockets and waistband of the bottoms, back of the shoes/socks, watch on the wrist).
- DO NOT add any extra items, hats, bandanas, headscarves, or bags that were not worn in IMAGE 1.
- Plain light-gray studio background, matching lighting and shadows, full body visible from head to feet, photorealistic.
${backInstruction}

REAR POSE & ANATOMY:
${rearPoseDirectives}

${garmentDetails}

Return exactly one image and no explanatory text.`
  }

  const referenceInstruction = hasReferenceImage
    ? 'The final input image is the already generated FRONT view. Use it only as a consistency reference for the person\'s identity, outfit, lighting, and studio setup. Do not copy its front-facing pose; rotate the same person to the requested view.'
    : 'There is no generated reference image yet. Preserve the identity from the person image exactly.'

  const poseInstruction = preservePose
    ? 'CRITICAL POSE PRESERVATION: Strictly preserve the EXACT body pose, stance, posture, head tilt, and arm/hand placement of the person in IMAGE 1. Do NOT force a generic stiff standing pose — mirror the natural posture, hand positions, and body gestures from IMAGE 1 exactly.'
    : 'POSE: Generate a natural, stylish, and flattering fashion model pose best suited to showcase the outfit, while preserving the person\'s identity, face, hair, and body proportions from IMAGE 1.'

  return `Using the person in IMAGE 1, generate one full-body photo of the SAME person wearing exactly the ${garmentCount} clothing item(s) shown in the garment reference images. Keep the person's face, hair, skin tone and body proportions identical. Reproduce each garment's color, pattern, logo, material and cut faithfully. Do not add, remove, merge, or redesign any garment. View: ${angleDescriptions[angle]}. Plain light-gray studio background, even lighting, full body visible from head to feet, photorealistic.

${poseInstruction}

${layeringInstruction}

${garmentDetails}

${referenceInstruction}
${backInstruction}

Return exactly one image and no explanatory text.`
}

export { angleDescriptions }
