export default function Avatar({ user, size = 36 }) {
  const initials = user.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const box = { width: size, height: size };
  return user.photo ? (
    <img src={`/api/photos/${user.photo}`} alt={user.full_name} style={box} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={{ ...box, fontSize: size * 0.38 }} className="grid shrink-0 place-items-center rounded-full bg-teal-100 font-bold text-teal-800">
      {initials}
    </span>
  );
}