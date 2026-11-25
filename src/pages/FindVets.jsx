import useAuthStore from "../store/useAuthStore";
import useNearbyServices from "../hooks/useNearbyServices";

export default function FindVets() {
  const buyer = useAuthStore((s) => s.userProfile);
  const { results, loading, error } = useNearbyServices("vets", {
    districtId: buyer?.districtId,
    provinceId: buyer?.provinceId,
    ward: buyer?.ward,
  });

  if (loading) return <p>Finding vets near you…</p>;
  if (error) return <p>Could not load vets: {error}</p>;
  if (!buyer?.districtId && !buyer?.provinceId)
    return <p>Add your location to your profile to find vets near you.</p>;
  if (results.length === 0) return <p>No vets found in your area yet.</p>;

  return (
    <ul>
      {results.map((v) => (
        <li key={v.id}>
          <strong>{v.businessName}</strong>
          <div>
            {v.ward ? `Ward ${v.ward}, ` : ""}{v.district}, {v.province}
          </div>
          {v.ward === buyer.ward && <span>In your ward</span>}
          <a href={`tel:${v.phone}`}>Call</a>
        </li>
      ))}
    </ul>
  );
}