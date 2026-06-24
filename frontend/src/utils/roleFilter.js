export function expandRoleFilter(role) {
  if (role === "student") return "student,bde";
  return role;
}

export function determineRegisterRole(inviteRole, selectedRole) {
  if (inviteRole === "teacher") return "teacher";
  return selectedRole === true || selectedRole === "alumni" ? "alumni" : "student";
}

export function validateRegisterEmail(email, role) {
  if (!email || !role) return false;
  if (role === "student")
    return /^hei\.[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
  if (role === "alumni") return email.includes("@");
  return true;
}
