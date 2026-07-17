export function adminRoom(id: string) {
  return `doctor_room:${id}`;
}

export function userRoom(id: string) {
  return `admin_room:${id}`;
}
