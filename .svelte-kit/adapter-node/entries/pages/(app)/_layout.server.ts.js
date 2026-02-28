const load = async ({ locals }) => {
  return {
    user: locals.user ? {
      id: locals.user.id,
      name: locals.user.name,
      email: locals.user.email,
      image: locals.user.image,
      role: locals.user.role ?? "player"
    } : null
  };
};
export {
  load
};
