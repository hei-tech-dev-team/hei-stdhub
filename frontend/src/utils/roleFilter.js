export function expandRoleFilter(role) {
  if (role === "student") return "student,bde";
  return role;
}
