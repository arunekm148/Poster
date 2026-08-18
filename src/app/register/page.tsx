"use client";

import {
  ChangeEvent,
  FormEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* INDIA STATES / UT + DISTRICTS                                              */
/* -------------------------------------------------------------------------- */

const indiaLocations: Record<string, string[]> = {
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": [
    "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla",
    "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur",
    "Kakinada", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu",
    "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai",
    "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "Y.S.R. Kadapa",
  ],
  "Arunachal Pradesh": [
    "Anjaw", "Bichom", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle",
    "Keyi Panyor", "Kra Daadi", "Kurung Kumey", "Leparada", "Lohit", "Longding",
    "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang",
    "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri",
    "West Kameng", "West Siang",
  ],
  Assam: [
    "Bajali", "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang",
    "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat",
    "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong",
    "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari",
    "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tamulpur", "Tinsukia", "Udalguri",
    "West Karbi Anglong",
  ],
  Bihar: [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar",
    "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur",
    "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger",
    "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur",
    "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali",
    "West Champaran",
  ],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: [
    "Balod", "Baloda Bazar-Bhatapara", "Balrampur-Ramanujganj", "Bastar", "Bemetara", "Bijapur",
    "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Khairagarh-Chhuikhadan-Gandai",
    "Kondagaon", "Korba", "Korea", "Mahasamund", "Manendragarh-Chirmiri-Bharatpur",
    "Mohla-Manpur-Ambagarh Chowki", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon",
    "Sakti", "Sarangarh-Bilaigarh", "Sukma", "Surajpur", "Surguja",
  ],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  Delhi: [
    "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi",
    "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi",
  ],
  Goa: ["North Goa", "South Goa"],
  Gujarat: [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad",
    "Chhota Udepur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar",
    "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari",
    "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi",
    "Vadodara", "Valsad",
  ],
  Haryana: [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula",
    "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar",
  ],
  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi",
    "Shimla", "Sirmaur", "Solan", "Una",
  ],
  "Jammu and Kashmir": [
    "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua",
    "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba",
    "Shopian", "Srinagar", "Udhampur",
  ],
  Jharkhand: [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu",
    "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum",
  ],
  Karnataka: [
    "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar",
    "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada",
    "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar",
    "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi",
    "Uttara Kannada", "Vijayapura", "Vijayanagara", "Yadgir",
  ],
  Kerala: [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode",
    "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad",
  ],
  Ladakh: ["Kargil", "Leh"],
  Lakshadweep: ["Lakshadweep"],
  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind",
    "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori",
    "Guna", "Gwalior", "Harda", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone",
    "Maihar", "Mandla", "Mandsaur", "Mauganj", "Morena", "Narmadapuram", "Narsinghpur", "Neemuch",
    "Niwari", "Pandhurna", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore",
    "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain",
    "Umaria", "Vidisha",
  ],
  Maharashtra: [
    "Ahilyanagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur",
    "Chhatrapati Sambhajinagar", "Dharashiv", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon",
    "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar",
    "Nashik", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal",
  ],
  Manipur: [
    "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching",
    "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal",
    "Ukhrul",
  ],
  Meghalaya: [
    "East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "Eastern West Khasi Hills",
    "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills",
    "West Garo Hills", "West Jaintia Hills", "West Khasi Hills",
  ],
  Mizoram: [
    "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit",
    "Saitual", "Serchhip", "Siaha",
  ],
  Nagaland: [
    "Chumoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Meluri", "Mokokchung", "Mon",
    "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha", "Zunheboto",
  ],
  Odisha: [
    "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal",
    "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara",
    "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada",
    "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh",
  ],
  Puducherry: ["Karaikal", "Mahe", "Puducherry", "Yanam"],
  Punjab: [
    "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur",
    "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Mansa", "Moga", "Pathankot",
    "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shaheed Bhagat Singh Nagar",
    "Sri Muktsar Sahib", "Tarn Taran",
  ],
  Rajasthan: [
    "Ajmer", "Alwar", "Balotra", "Banswara", "Baran", "Barmer", "Beawar", "Bharatpur", "Bhilwara",
    "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Deeg", "Dholpur", "Didwana-Kuchaman",
    "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur",
    "Karauli", "Khairthal-Tijara", "Kota", "Kotputli-Behror", "Nagaur", "Pali", "Phalodi", "Pratapgarh",
    "Rajsamand", "Salumbar", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur",
  ],
  Sikkim: ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"],
  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
    "Kallakurichi", "Kancheepuram", "Kanniyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
    "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet",
    "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli",
    "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar",
  ],
  Telangana: [
    "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", "Jangaon",
    "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam",
    "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak",
    "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad",
    "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad",
    "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri",
  ],
  Tripura: ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": [
    "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat",
    "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor",
    "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad",
    "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur",
    "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat",
    "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow",
    "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad",
    "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur",
    "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur",
    "Sonbhadra", "Sultanpur", "Unnao", "Varanasi",
  ],
  Uttarakhand: [
    "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal",
    "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi",
  ],
  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly",
    "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
    "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas", "Uttar Dinajpur",
  ],
};

const CROP_SIZE = 300;
const OUTPUT_SIZE = 800;

export default function RegisterPage() {
  const [state, setState] = useState("Kerala");
  const [district, setDistrict] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [croppedPhoto, setCroppedPhoto] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragOriginX = useRef(0);
  const dragOriginY = useRef(0);

  const stateNames = Object.keys(indiaLocations).sort((a, b) => a.localeCompare(b));
  const availableDistricts = indiaLocations[state] || [];

  useEffect(() => {
    return () => {
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    };
  }, [cropImageUrl]);

  useEffect(() => {
    return () => {
      if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    };
  }, [croppedPreviewUrl]);

  function getBaseScale() {
    if (naturalWidth <= 0 || naturalHeight <= 0) return 1;
    return Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
  }

  function clampPosition(nextX: number, nextY: number, nextZoom = zoom) {
    if (naturalWidth <= 0 || naturalHeight <= 0) return { x: 0, y: 0 };

    const scale = getBaseScale() * nextZoom;
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;
    const maxX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (displayHeight - CROP_SIZE) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY)),
    };
  }

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      window.alert("Please select JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert("Image size must be below 5 MB.");
      return;
    }

    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);

    const objectUrl = URL.createObjectURL(file);
    setNaturalWidth(0);
    setNaturalHeight(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setDragging(false);
    setCropImageUrl(objectUrl);
  }

  function handleCropImageLoad() {
    const image = cropImageRef.current;
    if (!image) return;

    setNaturalWidth(image.naturalWidth);
    setNaturalHeight(image.naturalHeight);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  function handleZoomChange(nextZoom: number) {
    const position = clampPosition(offsetX, offsetY, nextZoom);
    setZoom(nextZoom);
    setOffsetX(position.x);
    setOffsetY(position.y);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!naturalWidth || !naturalHeight) return;

    setDragging(true);
    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;
    dragOriginX.current = offsetX;
    dragOriginY.current = offsetY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;

    const deltaX = event.clientX - dragStartX.current;
    const deltaY = event.clientY - dragStartY.current;
    const position = clampPosition(dragOriginX.current + deltaX, dragOriginY.current + deltaY);
    setOffsetX(position.x);
    setOffsetY(position.y);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {}
  }

  async function createCroppedBlob() {
    const image = cropImageRef.current;
    if (!image || !naturalWidth || !naturalHeight) throw new Error("Image is not ready.");

    const scale = getBaseScale() * zoom;
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;
    const imageLeft = (CROP_SIZE - displayWidth) / 2 + offsetX;
    const imageTop = (CROP_SIZE - displayHeight) / 2 + offsetY;

    let sourceX = -imageLeft / scale;
    let sourceY = -imageTop / scale;
    const sourceSize = CROP_SIZE / scale;

    sourceX = Math.max(0, Math.min(naturalWidth - sourceSize, sourceX));
    sourceY = Math.max(0, Math.min(naturalHeight - sourceSize, sourceY));

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare cropped image.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.9);
    });

    if (!blob) throw new Error("Unable to crop image.");
    return blob;
  }

  async function useCroppedPhoto() {
    try {
      const blob = await createCroppedBlob();

      if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);

      const previewUrl = URL.createObjectURL(blob);
      setCroppedPhoto(blob);
      setCroppedPreviewUrl(previewUrl);
      closeCropper();
    } catch (error) {
      console.error("CROP ERROR:", error);
      window.alert(error instanceof Error ? error.message : "Unable to crop photo.");
    }
  }

  function closeCropper() {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
    setNaturalWidth(0);
    setNaturalHeight(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setDragging(false);
  }

  function removePhoto() {
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(null);
    setCroppedPhoto(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setMessage("");
    setSuccess(false);

    try {
      setSubmitting(true);

      const formData = new FormData(form);

      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").replace(/\D/g, "").slice(-10);
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");

      if (!name) {
        window.alert("Please enter your full name.");
        return;
      }

      if (!/^[6-9]\d{9}$/.test(phone)) {
        window.alert("Please enter a valid 10 digit mobile number.");
        return;
      }

      if (!email) {
        window.alert("Email address is required.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        window.alert("Please enter a valid email address.");
        return;
      }

      if (!state) {
        window.alert("Please select state.");
        return;
      }

      if (!district) {
        window.alert("Please select district.");
        return;
      }

      if (!password) {
        window.alert("Please create a password.");
        return;
      }

      if (password.length < 6) {
        window.alert("Password must contain at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        window.alert("Password and Confirm Password do not match.");
        return;
      }

      formData.set("phone", phone);
      formData.set("email", email);
      formData.set("state", state);
      formData.set("district", district);
      formData.delete("companyId");
      formData.delete("logo");

      if (croppedPhoto) {
        formData.append("logo", croppedPhoto, "agent-logo.webp");
      }

      const response = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      let data: { success?: boolean; message?: string } = {};

      try {
        data = await response.json();
      } catch {}

      if (!response.ok || !data.success) {
        window.alert(data.message || "Unable to create account. Please try again.");
        return;
      }

      setSuccess(true);
      setMessage(data.message || "Registration successful! Your account has been created.");
      window.alert(data.message || "Registration successful! Your account has been created.");

      form.reset();
      setState("Kerala");
      setDistrict("");
      removePhoto();
    } catch (error) {
      console.error("REGISTER ERROR:", error);
      window.alert("Something went wrong while creating your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const cropScale =
    naturalWidth && naturalHeight ? getBaseScale() * zoom : 1;

  const cropDisplayWidth = naturalWidth * cropScale;
  const cropDisplayHeight = naturalHeight * cropScale;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-8 text-slate-950">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur">
            🛡️ Agent Platform
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-6 py-7 text-center sm:px-8">
            <div className="text-5xl">🛡️</div>
            <h1 className="mt-3 text-3xl font-black text-slate-950">Agent Self Registration</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">Create your Agent Platform account</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 p-6 md:grid-cols-2 md:p-8">
            <div>
              <label htmlFor="name" className="block text-sm font-black text-slate-950">Full Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter full name"
                autoComplete="name"
                required
                className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-black text-slate-950">Mobile Number *</label>
              <div className="mt-2 flex">
                <span className="flex items-center rounded-l-xl border border-r-0 border-slate-400 bg-slate-100 px-3 font-black text-slate-900">+91</span>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10 digit mobile"
                  autoComplete="tel"
                  required
                  className="w-full rounded-r-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">Mobile number must be unique.</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-black text-slate-950">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter email"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs font-semibold text-slate-500">Used for account recovery and registration communication.</p>
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-black text-slate-950">State / Union Territory *</label>
              <select
                id="state"
                name="state"
                value={state}
                onChange={(event) => {
                  setState(event.target.value);
                  setDistrict("");
                }}
                required
                className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              >
                {stateNames.map((stateName) => (
                  <option key={stateName} value={stateName}>{stateName}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="district" className="block text-sm font-black text-slate-950">District *</label>
              <select
                id="district"
                name="district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select District</option>
                {availableDistricts.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <p className="mt-2 text-xs font-semibold text-slate-500">Districts shown for {state}</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-black text-slate-950">Password *</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Create password"
                minLength={6}
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-black text-slate-950">Confirm Password *</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                minLength={6}
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-black text-slate-950">
                Agent / Agency Photo or Logo <span className="font-semibold text-slate-500">(Optional)</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!croppedPreviewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-5 font-black text-blue-800 transition hover:bg-blue-100"
                >
                  📷 Choose Photo / Logo
                </button>
              ) : (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow">
                      <img
                        src={croppedPreviewUrl}
                        alt="Cropped profile preview"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-black text-emerald-700">✓ Cropped photo ready</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">This cropped version will be saved with the agent account.</p>

                      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                        >
                          Change Photo
                        </button>

                        <button
                          type="button"
                          onClick={removePhoto}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs font-semibold text-slate-600">
                Select an image, crop the required area and only the cropped image will be saved.
              </p>
            </div>

            {message && success && (
              <div className="md:col-span-2">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
                  ✓ {message}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-blue-700 to-slate-900 p-3.5 font-black text-white shadow-lg transition hover:from-blue-800 hover:to-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center">
            <span className="font-semibold text-slate-600">Already registered? </span>
            <a href="/login" className="font-black text-blue-700">Login</a>
          </div>
        </div>
      </div>

      {cropImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <div className="my-6 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Crop Photo</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Move and zoom the image until the required area is inside the square.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCropper}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5">
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                className={`relative mx-auto h-[300px] w-[300px] touch-none overflow-hidden rounded-2xl bg-slate-950 ${
                  dragging ? "cursor-grabbing" : "cursor-grab"
                }`}
              >
                <img
                  ref={cropImageRef}
                  src={cropImageUrl}
                  alt="Crop preview"
                  draggable={false}
                  onLoad={handleCropImageLoad}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{
                    width: cropDisplayWidth || undefined,
                    height: cropDisplayHeight || undefined,
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`,
                  }}
                />

                <div className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-white" />
                <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/30" />
                <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/30" />
                <div className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-white/30" />
                <div className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-white/30" />
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label htmlFor="registerPhotoZoom" className="text-sm font-black text-slate-800">Zoom</label>
                  <span className="text-sm font-black text-blue-700">{Math.round(zoom * 100)}%</span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xl font-black">−</span>
                  <input
                    id="registerPhotoZoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) => handleZoomChange(Number(event.target.value))}
                    className="w-full accent-blue-700"
                  />
                  <span className="text-xl font-black">+</span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-slate-500">
                Drag with mouse or finger to position the photo.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeCropper}
                  className="rounded-xl border-2 border-slate-300 px-4 py-3 font-black text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!naturalWidth || !naturalHeight}
                  onClick={() => void useCroppedPhoto()}
                  className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  ✓ Use Cropped Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
