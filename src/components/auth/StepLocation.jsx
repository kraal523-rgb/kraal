/* eslint-disable react-hooks/set-state-in-effect */
import  { useEffect, useState } from "react";
import { ZIMBABWE_PROVINCES } from "../../hooks/useRegister";
import {
  fetchProvinces,
  fetchDistricts,
  fetchTowns,
} from "../../services/geoService";

const COUNTRIES = [
  "Zimbabwe", "South Africa", "Zambia", "Botswana",
  "Mozambique", "Malawi", "Tanzania", "Kenya", "Other",
];

const byName = (a, b) =>
  String(a.name ?? a).localeCompare(String(b.name ?? b), undefined, {
    numeric: true,
  });

function validateLocation(form) {
  if (!form.country) return "Country is required.";
  if (!form.province.trim()) return "Province or region is required.";
  if (form.country === "Zimbabwe") {
    if (!form.district) return "District is required.";
    if (!form.city?.trim()) return "City or town is required.";
    // ward is only required if the district actually has wards listed
    if (form.hasWards && !form.ward) return "Please select your ward.";
  } else if (!form.city.trim()) {
    return "City or town is required.";
  }
  return null;
}

export default function StepLocation({ form, update, onNext, onBack, error }) {
  const isZimbabwe = form.country === "Zimbabwe";

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [towns, setTowns] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoFailed, setGeoFailed] = useState(false);

  // Load provinces once when Zimbabwe is selected
  useEffect(() => {
    if (!isZimbabwe) return;
    let alive = true;
    setGeoLoading(true);
    fetchProvinces()
      .then((p) => alive && (setProvinces([...p].sort(byName)), setGeoFailed(false)))
      .catch(() => alive && setGeoFailed(true))
      .finally(() => alive && setGeoLoading(false));
    return () => { alive = false; };
  }, [isZimbabwe]);

  useEffect(() => {
    if (!provinces.length || form.provinceId || !form.province) return;
    const match = provinces.find(
      (p) => p.name?.toLowerCase() === form.province.toLowerCase()
    );
    if (match) update({ provinceId: match.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinces]);
  // Load districts + towns whenever the province changes
  useEffect(() => {
    if (!isZimbabwe || !form.provinceId) {
      setDistricts([]);
      setTowns([]);
      return;
    }
    let alive = true;
    setGeoLoading(true);
    Promise.all([fetchDistricts(form.provinceId), fetchTowns(form.provinceId)])
      .then(([d, t]) => {
        if (!alive) return;
        setDistricts([...d].sort(byName));
        setTowns([...t].sort(byName));
      })
      .catch(() => alive && setGeoFailed(true))
      .finally(() => alive && setGeoLoading(false));
    return () => { alive = false; };
  }, [isZimbabwe, form.provinceId]);

  const selectedDistrict = districts.find((d) => d.id === form.districtId);
  const wards = [...(selectedDistrict?.wards || [])].sort(byName);

  // Keep a flag the validator can use
  useEffect(() => {
    update({ hasWards: wards.length > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict?.id, wards.length]);

  const handleNext = (e) => {
    e.preventDefault();
    onNext(validateLocation);
  };

  const handleCountryChange = (e) => {
    update({
      country: e.target.value,
      province: "", provinceId: "",
      district: "", districtId: "",
      ward: "", city: "",
    });
  };

  const handleProvinceChange = (e) => {
    const p = provinces.find((x) => x.id === e.target.value);
    update({
      province: p?.name || "",
      provinceId: p?.id || "",
      district: "", districtId: "",
      ward: "", city: "",
    });
  };

  const handleDistrictChange = (e) => {
    const d = districts.find((x) => x.id === e.target.value);
    update({ district: d?.name || "", districtId: d?.id || "", ward: "" });
  };

  // Use Firestore data if it loaded; otherwise fall back to the static list
  const useCascade = isZimbabwe && !geoFailed;

  return (
    <form className="step-form" onSubmit={handleNext} noValidate>
      <h2 className="step-title">Where are you located?</h2>
      <p className="step-sub">
        Buyers, transporters and vets search by location to find the nearest service.
      </p>

      <div className="field">
        <label htmlFor="country">
          Country <span className="required">*</span>
        </label>
        <select id="country" value={form.country} onChange={handleCountryChange} required>
          <option value="">Select a country…</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="field-row">
        {/* PROVINCE */}
        <div className="field">
          <label htmlFor="province">
            Province <span className="required">*</span>
          </label>
          {useCascade ? (
            <select
              id="province"
              value={form.provinceId || ""}
              onChange={handleProvinceChange}
              disabled={geoLoading && provinces.length === 0}
              required
            >
              <option value="">
                {geoLoading && provinces.length === 0 ? "Loading…" : "Select a province…"}
              </option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : isZimbabwe ? (
            <select
              id="province"
              value={form.province}
              onChange={(e) => update({ province: e.target.value })}
              required
            >
              <option value="">Select a province…</option>
              {ZIMBABWE_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <input
              id="province"
              type="text"
              placeholder="Province or region"
              value={form.province}
              onChange={(e) => update({ province: e.target.value })}
              required
            />
          )}
        </div>

        {/* DISTRICT (Zimbabwe only) */}
        {useCascade && (
          <div className="field">
            <label htmlFor="district">
              District <span className="required">*</span>
            </label>
            <select
              id="district"
              value={form.districtId || ""}
              onChange={handleDistrictChange}
              disabled={!form.provinceId || geoLoading}
              required
            >
              <option value="">
                {!form.provinceId ? "Select a province first" : "Select a district…"}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="field-row">
        {/* WARD */}
        {useCascade && (
          <div className="field">
            <label htmlFor="ward">
              Ward {wards.length > 0 && <span className="required">*</span>}
            </label>
            <select
              id="ward"
              value={form.ward || ""}
              onChange={(e) => update({ ward: e.target.value })}
              disabled={!form.districtId}
            >
              <option value="">
                {!form.districtId
                  ? "Select a district first"
                  : wards.length === 0
                    ? "No wards listed"
                    : "Select your ward…"}
              </option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        )}

        {/* CITY / TOWN */}
        <div className="field">
          <label htmlFor="city">
            City / Town <span className="required">*</span>
          </label>
          {useCascade && towns.length > 0 ? (
            <select
              id="city"
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
              required
            >
              <option value="">Select nearest town…</option>
              {towns.map((t) => (
                <option key={t.id} value={t.name || t.id}>{t.name || t.id}</option>
              ))}
            </select>
          ) : (
            <input
              id="city"
              type="text"
              placeholder="e.g. Chinhoyi"
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
              required
            />
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">
          Farm address <span className="optional">(optional)</span>
        </label>
        <textarea
          id="address"
          rows={2}
          placeholder="Street address, farm name, or nearest landmark"
          value={form.address}
          onChange={(e) => update({ address: e.target.value })}
        />
        <span style={{ fontSize: "0.78rem", color: "#6B6860", marginTop: "4px" }}>
          Only shared with buyers after a confirmed sale.
        </span>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button type="submit" className="btn-primary">Continue →</button>
      </div>
    </form>
  );
}