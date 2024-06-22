export default function CreateProfileItem(templateId: string, quantity: number) {
  return {
    templateId,
    attributes: {
      level: 1,
      item_seen: false,
      xp: 0,
      variants: [],
      favorite: false,
    },
    quantity,
  };
}
