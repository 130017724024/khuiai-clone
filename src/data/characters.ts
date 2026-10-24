export type Character = {
  id: string;
  name: string;
  quote: string;
  chats: string;
  image: string;
  tags: string[];
  greeting: string;
};

const IMG = 'https://storage.googleapis.com/khuiai.appspot.com';
const IMG2 = 'https://img.khuiai.com/khuiai.appspot.com';

export const characters: Character[] = [
  {
    id: 'jaokhun',
    name: 'เจ้าขุน | 𝐉𝐚𝐨𝐤𝐡𝐮𝐧',
    quote: '"ไอ่ผี มึงอย่ามายุ่งกับกู! วันนี้กูขอนอนเถอะ"',
    chats: '172.9k',
    image: `${IMG2}/character-drafts/main/5toVP7UfiAO3iLt96H6lG7MhXXu1_main_image_1791490574793_66k6jdl1.jpeg`,
    tags: ['ผี', 'ตลก'],
    greeting: 'เฮ้ย! มึงเข้ามาทำไมเนี่ย กูจะนอนแล้วนะ... เออ มีอะไรก็ว่ามา',
  },
  {
    id: 'escape-room',
    name: 'พละ : มาคัส : โรมัน : ศร | Escape Room',
    quote: 'ภารกิจสั่งให้พวกกูรุมเx็ดมึง พวกกูยังไม่อยากตxย ขอร้องละ',
    chats: '214.1k',
    image: `${IMG2}/character-drafts/main/rDGWLPiyxFNLVe8GymxlxkABHDm1_main_image_1791757710933_aawgual3.jpeg`,
    tags: ['ระทึกขวัญ', 'ชาย'],
    greeting: 'ประตูห้องถูกล็อกอีกแล้ว... พวกเรามีเวลาแค่ 60 นาที เริ่มหาทางออกกันเถอะ',
  },
  {
    id: 'hans',
    name: 'ฮันส์ x โช่ x พีท x โฟร์ | เพื่อนสนิท?',
    quote: 'ไพ่มันสั่งให้พวกกูรุมเx็ดมึงว่ะ... อย่าหาว่าพวกกูฉวยโอกาสเลย',
    chats: '1.2m',
    image: `${IMG2}/characters/WpV8kdHoS7gN2DhSJvGbBN03k1z2_1791024461520.jpeg`,
    tags: ['โรแมนติก', 'ชาย'],
    greeting: 'อ้าว มาแล้วเหรอ... พวกเราเพิ่งคุยเรื่องเธอกันอยู่พอดีเลย',
  },
  {
    id: 'nura',
    name: 'นูระ ริคิวยะ | KNYK',
    quote: '"ขยะที่พวกเจ้ากล่าวถึง คือว่าที่ภรรยาของผู้นำขบวนร้อยอสูร"',
    chats: '33.8k',
    image: `${IMG2}/character-drafts/main/BxbKqZxYIxQ1vgzht49WlJdjw4E2_main_image_1789243263868_bwdxdwgh.jpeg`,
    tags: ['แฟนตาซี', 'หญิง'],
    greeting: 'เจ้ามนุษย์... เจ้ากล้ามาหาถึงที่นี่ได้อย่างไร รู้หรือไม่ว่าข้าคือใคร',
  },
  {
    id: 'mint',
    name: 'มิ้นท์𝓜𝓲𝓷𝓽🍭 │ แฟนเก่ารุ่นพี่',
    quote: 'พี่มาง้อหนูแล้วนี่ไง ปารัช วัฒนะไพบูลย์กุล กลับมาเป็นของพี่น',
    chats: '58k',
    image: `${IMG2}/characters/lrzMifXY5SP85E6bdkflQ48ldow2_1791714110846.jpeg`,
    tags: ['โรแมนติก', 'นักเรียน'],
    greeting: 'พี่... หนูไม่คิดว่าจะเจอพี่ที่นี่ หนูยังคิดถึงพี่อยู่นะ',
  },
  {
    id: 'khanngern',
    name: 'ขันเงิน | 7เกียร์มรณะภาพ',
    quote: 'ปารัช วัฒนะไพบูลย์กุล เหรอ? แค่หมูทะมื้อเดียวสำหรับกูว่ะ',
    chats: '198.9k',
    image: `${IMG2}/character-drafts/main/f2S4IYZSaLOneGkkt3rInqMrIOm1_main_image_1791612338943_2s4ulbev.jpeg`,
    tags: ['แอ็กชัน', 'ชาย'],
    greeting: 'มึงมาคนเดียวเหรอ? ดี กูไม่ชอบให้ใครมายุ่งตอนกูกินหมูทะ',
  },
  {
    id: 'meen',
    name: 'มีน | รูมเมทเฉยเมย',
    quote: '"จะยืนจ้องอะไรนักหนา กุญแจอยู่บนโต๊ะ"',
    chats: '86.4k',
    image: `${IMG}/characters/additional/YQO0Be4YPqMLNoH79t9DOxExAUf1_additional_3_1789740309523_5wia11275.jpeg`,
    tags: ['นักศึกษา', 'หญิง'],
    greeting: 'อือ... กลับมาแล้วเหรอ กับข้าวอยู่ในตู้เย็นนะ',
  },
  {
    id: 'pudding',
    name: 'พุดดิ้ง | ยัยหมูสามชั้น🐷',
    quote: '"พี่! หนูไม่ได้กินเยอะนะ แค่ชิมเฉยๆ"',
    chats: '121.2k',
    image: `${IMG}/character-drafts/main/kUpxCzf8Zth26bnH5IYFkdMLkKH2_main_image_1787749341875_vgeeywsd.jpeg`,
    tags: ['น่ารัก', 'ตลก'],
    greeting: 'พี่มาแล้ว! หนูรอพี่อยู่เลย ไปกินหมูกระทะกันนะ',
  },
  {
    id: 'nam',
    name: 'นํ้า | เพื่อนสนิทอยากลอง🔞🥵',
    quote: '"เราเป็นเพื่อนกันมานาน... แต่คืนนี้เราเป็นมากกว่านั้นได้ไหม"',
    chats: '323.4k',
    image: `${IMG}/characters/additional/YQO0Be4YPqMLNoH79t9DOxExAUf1_additional_0_1787472421337_vkefn7m3o.jpeg`,
    tags: ['โรแมนติก', 'หญิง'],
    greeting: 'นั่งลงก่อนสิ... เรามีเรื่องอยากคุยกับเธอมานานแล้ว',
  },
  {
    id: 'namnueng',
    name: 'น้ำหนึ่ง|Namnueng🌹✨',
    quote: '"พี่คะ ดอกกุหลาบนี่สวยจัง ซื้อให้หนูเหรอ"',
    chats: '158.9k',
    image: `${IMG}/character-drafts/support-characters/dnXXQqrEaLdiXVtpdywUQCZOMnJ3_support_character_1785963724341_aabpc2lw.jpeg`,
    tags: ['ไอดอล', 'หญิง'],
    greeting: 'พี่คะ! หนูดีใจจังที่พี่มา มาดูพระอาทิตย์ตกด้วยกันนะ',
  },
  {
    id: 'berry',
    name: 'เบรี่|berry 🍓💦 น้องสาวบุญธรรม',
    quote: '"พี่ครับ อย่าทิ้งเบรี่ไว้คนเดียวนะ"',
    chats: '233.2k',
    image: `${IMG}/character-drafts/main/dnXXQqrEaLdiXVtpdywUQCZOMnJ3_main_image_1785333157033_76v4yaop.jpeg`,
    tags: ['น่ารัก', 'หญิง'],
    greeting: 'พี่ครับ! เบรี่ทำขนมรอพี่อยู่ตั้งนาน แบ่งกันกินนะ',
  },
  {
    id: 'moji',
    name: 'โมจิ | เชียร์ลีดเดอร์📣',
    quote: '"เกมนี้ต้องชนะ! โมจิจะเชียร์สุดเสียงเลย"',
    chats: '175.6k',
    image: `${IMG}/character-drafts/additional-images/kUpxCzf8Zth26bnH5IYFkdMLkKH2_additional_image_2_1781695124881_vzmxdfmy.jpeg`,
    tags: ['นักกีฬา', 'หญิง'],
    greeting: 'มาแล้วเหรอ! โมจิเพิ่งซ้อมเสร็จเลย เหนื่อยมากเลยนะ',
  },
];

export function getCharacter(id?: string) {
  return characters.find((c) => c.id === id) ?? characters[0];
}
