// Thai Sector Taxonomy Database for Credit Underwriting
// Sector > Industry > Sub-Industry classification with credit scoring

export interface TaxonomyEntry {
  sector: string;
  industry: string;
  subIndustry: string;
  score: number;  // Base credit score (1-10, lower = better credit)
  points: number; // Priority points (1-5, higher = higher priority)
}

export const THAI_SECTOR_TAXONOMY: TaxonomyEntry[] = [
  // Agriculture & Agribusiness
  { sector: "Agriculture & Agribusiness", industry: "Crop farming", subIndustry: "Rice cultivation", score: 9, points: 2 },
  { sector: "Agriculture & Agribusiness", industry: "Crop farming", subIndustry: "Cassava & starch crops", score: 8, points: 1 },
  { sector: "Agriculture & Agribusiness", industry: "Crop farming", subIndustry: "Sugar cane farming", score: 8, points: 2 },
  { sector: "Agriculture & Agribusiness", industry: "Crop farming", subIndustry: "Rubber plantations", score: 7, points: 2 },
  { sector: "Agriculture & Agribusiness", industry: "Crop farming", subIndustry: "Palm oil plantations", score: 7, points: 2 },
  { sector: "Agriculture & Agribusiness", industry: "Crop farming", subIndustry: "Fruit orchards", score: 8, points: 1 },
  { sector: "Agriculture & Agribusiness", industry: "Livestock & poultry", subIndustry: "Poultry farming", score: 6, points: 3 },
  { sector: "Agriculture & Agribusiness", industry: "Livestock & poultry", subIndustry: "Swine farming", score: 6, points: 3 },
  { sector: "Agriculture & Agribusiness", industry: "Livestock & poultry", subIndustry: "Dairy farming", score: 7, points: 2 },
  { sector: "Agriculture & Agribusiness", industry: "Aquaculture & fisheries", subIndustry: "Shrimp farming", score: 5, points: 3 },
  { sector: "Agriculture & Agribusiness", industry: "Aquaculture & fisheries", subIndustry: "Fish farming (tilapia, catfish)", score: 6, points: 2 },
  { sector: "Agriculture & Agribusiness", industry: "Aquaculture & fisheries", subIndustry: "Seafood processing", score: 4, points: 4 },
  { sector: "Agriculture & Agribusiness", industry: "Agricultural services", subIndustry: "Cold storage & logistics", score: 4, points: 4 },
  { sector: "Agriculture & Agribusiness", industry: "Agricultural services", subIndustry: "Grain silos & warehousing", score: 5, points: 3 },

  // Food & Beverage Manufacturing
  { sector: "Food & Beverage Manufacturing", industry: "Processed & packaged foods", subIndustry: "Ready-to-eat / frozen foods", score: 4, points: 4 },
  { sector: "Food & Beverage Manufacturing", industry: "Processed & packaged foods", subIndustry: "Canned foods", score: 5, points: 3 },
  { sector: "Food & Beverage Manufacturing", industry: "Processed & packaged foods", subIndustry: "Snack foods & confectionery", score: 4, points: 4 },
  { sector: "Food & Beverage Manufacturing", industry: "Processed & packaged foods", subIndustry: "Instant noodles & dry goods", score: 3, points: 4 },
  { sector: "Food & Beverage Manufacturing", industry: "Beverages", subIndustry: "Soft drinks & bottled water", score: 3, points: 4 },
  { sector: "Food & Beverage Manufacturing", industry: "Beverages", subIndustry: "Beer & spirits", score: 3, points: 5 },
  { sector: "Food & Beverage Manufacturing", industry: "Beverages", subIndustry: "Dairy products & milk", score: 4, points: 4 },
  { sector: "Food & Beverage Manufacturing", industry: "Sugar & starch", subIndustry: "Sugar mills", score: 5, points: 3 },
  { sector: "Food & Beverage Manufacturing", industry: "Sugar & starch", subIndustry: "Tapioca starch processing", score: 5, points: 3 },
  { sector: "Food & Beverage Manufacturing", industry: "Oils & fats", subIndustry: "Palm oil refining", score: 5, points: 3 },
  { sector: "Food & Beverage Manufacturing", industry: "Oils & fats", subIndustry: "Vegetable oil processing", score: 5, points: 3 },
  { sector: "Food & Beverage Manufacturing", industry: "Animal feed", subIndustry: "Livestock feed mills", score: 4, points: 4 },
  { sector: "Food & Beverage Manufacturing", industry: "Animal feed", subIndustry: "Aqua feed production", score: 4, points: 4 },

  // Automotive & Parts
  { sector: "Automotive & Parts", industry: "Vehicle manufacturing & assembly", subIndustry: "Passenger car assembly", score: 3, points: 5 },
  { sector: "Automotive & Parts", industry: "Vehicle manufacturing & assembly", subIndustry: "Commercial vehicle assembly", score: 3, points: 5 },
  { sector: "Automotive & Parts", industry: "Vehicle manufacturing & assembly", subIndustry: "Motorcycle assembly", score: 4, points: 4 },
  { sector: "Automotive & Parts", industry: "Vehicle manufacturing & assembly", subIndustry: "EV assembly / new platforms", score: 4, points: 4 },
  { sector: "Automotive & Parts", industry: "Auto parts & components", subIndustry: "Engine & powertrain parts", score: 3, points: 5 },
  { sector: "Automotive & Parts", industry: "Auto parts & components", subIndustry: "Body & chassis parts", score: 4, points: 4 },
  { sector: "Automotive & Parts", industry: "Auto parts & components", subIndustry: "Electrical components", score: 3, points: 5 },
  { sector: "Automotive & Parts", industry: "Auto parts & components", subIndustry: "Tires & rubber products", score: 4, points: 4 },
  { sector: "Automotive & Parts", industry: "Auto parts & components", subIndustry: "Glass & mirrors", score: 5, points: 3 },
  { sector: "Automotive & Parts", industry: "EV components", subIndustry: "Battery manufacturing", score: 2, points: 5 },
  { sector: "Automotive & Parts", industry: "EV components", subIndustry: "EV motors & controllers", score: 3, points: 5 },
  { sector: "Automotive & Parts", industry: "EV components", subIndustry: "Charging infrastructure", score: 3, points: 5 },

  // Technology & Electronics/ICT
  { sector: "Technology & Electronics/ICT", industry: "Electronics manufacturing", subIndustry: "Semiconductors & chips", score: 2, points: 5 },
  { sector: "Technology & Electronics/ICT", industry: "Electronics manufacturing", subIndustry: "PCB & circuit boards", score: 3, points: 5 },
  { sector: "Technology & Electronics/ICT", industry: "Electronics manufacturing", subIndustry: "Consumer electronics", score: 3, points: 4 },
  { sector: "Technology & Electronics/ICT", industry: "Electronics manufacturing", subIndustry: "Computer & peripherals", score: 3, points: 4 },
  { sector: "Technology & Electronics/ICT", industry: "Electronics manufacturing", subIndustry: "Home appliances", score: 4, points: 4 },
  { sector: "Technology & Electronics/ICT", industry: "Data centers & cloud", subIndustry: "Hyperscale / cloud campuses", score: 2, points: 5 },
  { sector: "Technology & Electronics/ICT", industry: "Data centers & cloud", subIndustry: "Colocation facilities", score: 2, points: 5 },
  { sector: "Technology & Electronics/ICT", industry: "Data centers & cloud", subIndustry: "Enterprise data centers", score: 3, points: 5 },
  { sector: "Technology & Electronics/ICT", industry: "Telecommunications", subIndustry: "Mobile network operators", score: 2, points: 5 },
  { sector: "Technology & Electronics/ICT", industry: "Telecommunications", subIndustry: "Fixed-line & broadband", score: 3, points: 4 },
  { sector: "Technology & Electronics/ICT", industry: "Telecommunications", subIndustry: "Telecom towers & infrastructure", score: 3, points: 5 },

  // Petrochemicals & Chemicals
  { sector: "Petrochemicals & Chemicals", industry: "Upstream petrochemicals", subIndustry: "Refineries", score: 2, points: 5 },
  { sector: "Petrochemicals & Chemicals", industry: "Upstream petrochemicals", subIndustry: "Olefins & aromatics", score: 2, points: 5 },
  { sector: "Petrochemicals & Chemicals", industry: "Upstream petrochemicals", subIndustry: "Natural gas processing", score: 2, points: 5 },
  { sector: "Petrochemicals & Chemicals", industry: "Downstream chemicals", subIndustry: "Plastics & polymers", score: 3, points: 5 },
  { sector: "Petrochemicals & Chemicals", industry: "Downstream chemicals", subIndustry: "Fertilizers", score: 4, points: 4 },
  { sector: "Petrochemicals & Chemicals", industry: "Downstream chemicals", subIndustry: "Industrial chemicals", score: 4, points: 4 },
  { sector: "Petrochemicals & Chemicals", industry: "Specialty chemicals", subIndustry: "Paints & coatings", score: 4, points: 4 },
  { sector: "Petrochemicals & Chemicals", industry: "Specialty chemicals", subIndustry: "Adhesives & sealants", score: 5, points: 3 },
  { sector: "Petrochemicals & Chemicals", industry: "Specialty chemicals", subIndustry: "Cleaning & detergents", score: 5, points: 3 },
  { sector: "Petrochemicals & Chemicals", industry: "Pharmaceutical chemicals", subIndustry: "API manufacturing", score: 3, points: 5 },
  { sector: "Petrochemicals & Chemicals", industry: "Pharmaceutical chemicals", subIndustry: "Drug formulation", score: 3, points: 5 },

  // Textiles & Apparel
  { sector: "Textiles & Apparel", industry: "Fiber & yarn", subIndustry: "Synthetic fiber production", score: 5, points: 3 },
  { sector: "Textiles & Apparel", industry: "Fiber & yarn", subIndustry: "Cotton spinning", score: 6, points: 2 },
  { sector: "Textiles & Apparel", industry: "Fabric manufacturing", subIndustry: "Weaving mills", score: 5, points: 3 },
  { sector: "Textiles & Apparel", industry: "Fabric manufacturing", subIndustry: "Knitting mills", score: 5, points: 3 },
  { sector: "Textiles & Apparel", industry: "Fabric manufacturing", subIndustry: "Dyeing & finishing", score: 5, points: 3 },
  { sector: "Textiles & Apparel", industry: "Garment manufacturing", subIndustry: "Apparel production", score: 6, points: 2 },
  { sector: "Textiles & Apparel", industry: "Garment manufacturing", subIndustry: "Sportswear & activewear", score: 5, points: 3 },
  { sector: "Textiles & Apparel", industry: "Garment manufacturing", subIndustry: "Uniforms & workwear", score: 6, points: 2 },
  { sector: "Textiles & Apparel", industry: "Technical textiles", subIndustry: "Automotive textiles", score: 4, points: 4 },
  { sector: "Textiles & Apparel", industry: "Technical textiles", subIndustry: "Medical textiles", score: 4, points: 4 },
  { sector: "Textiles & Apparel", industry: "Technical textiles", subIndustry: "Industrial fabrics", score: 5, points: 3 },

  // Steel & Metals
  { sector: "Steel & Metals", industry: "Primary steel", subIndustry: "Integrated steel mills", score: 3, points: 5 },
  { sector: "Steel & Metals", industry: "Primary steel", subIndustry: "Electric arc furnaces", score: 3, points: 5 },
  { sector: "Steel & Metals", industry: "Primary steel", subIndustry: "Steel rolling mills", score: 4, points: 4 },
  { sector: "Steel & Metals", industry: "Secondary steel", subIndustry: "Steel pipes & tubes", score: 4, points: 4 },
  { sector: "Steel & Metals", industry: "Secondary steel", subIndustry: "Steel wire & rods", score: 5, points: 3 },
  { sector: "Steel & Metals", industry: "Secondary steel", subIndustry: "Galvanized steel", score: 4, points: 4 },
  { sector: "Steel & Metals", industry: "Non-ferrous metals", subIndustry: "Aluminum smelting", score: 3, points: 5 },
  { sector: "Steel & Metals", industry: "Non-ferrous metals", subIndustry: "Copper processing", score: 4, points: 4 },
  { sector: "Steel & Metals", industry: "Non-ferrous metals", subIndustry: "Zinc & lead", score: 5, points: 3 },
  { sector: "Steel & Metals", industry: "Metal fabrication", subIndustry: "Structural steel", score: 5, points: 3 },
  { sector: "Steel & Metals", industry: "Metal fabrication", subIndustry: "Metal stamping & forming", score: 5, points: 3 },

  // Building Materials & Construction
  { sector: "Building Materials & Construction", industry: "Cement & concrete", subIndustry: "Cement plants", score: 3, points: 5 },
  { sector: "Building Materials & Construction", industry: "Cement & concrete", subIndustry: "Ready-mix concrete", score: 4, points: 4 },
  { sector: "Building Materials & Construction", industry: "Cement & concrete", subIndustry: "Precast concrete", score: 5, points: 3 },
  { sector: "Building Materials & Construction", industry: "Ceramics & tiles", subIndustry: "Floor & wall tiles", score: 4, points: 4 },
  { sector: "Building Materials & Construction", industry: "Ceramics & tiles", subIndustry: "Sanitary ware", score: 5, points: 3 },
  { sector: "Building Materials & Construction", industry: "Glass", subIndustry: "Flat glass manufacturing", score: 4, points: 4 },
  { sector: "Building Materials & Construction", industry: "Glass", subIndustry: "Container glass", score: 5, points: 3 },
  { sector: "Building Materials & Construction", industry: "Roofing & insulation", subIndustry: "Roofing materials", score: 5, points: 3 },
  { sector: "Building Materials & Construction", industry: "Roofing & insulation", subIndustry: "Insulation products", score: 5, points: 3 },
  { sector: "Building Materials & Construction", industry: "Construction services", subIndustry: "General contractors", score: 5, points: 3 },
  { sector: "Building Materials & Construction", industry: "Construction services", subIndustry: "Infrastructure contractors", score: 4, points: 4 },

  // Rubber & Plastics
  { sector: "Rubber & Plastics", industry: "Rubber products", subIndustry: "Tire manufacturing", score: 4, points: 4 },
  { sector: "Rubber & Plastics", industry: "Rubber products", subIndustry: "Industrial rubber goods", score: 5, points: 3 },
  { sector: "Rubber & Plastics", industry: "Rubber products", subIndustry: "Latex products", score: 5, points: 3 },
  { sector: "Rubber & Plastics", industry: "Plastic products", subIndustry: "Plastic packaging", score: 4, points: 4 },
  { sector: "Rubber & Plastics", industry: "Plastic products", subIndustry: "Plastic containers", score: 5, points: 3 },
  { sector: "Rubber & Plastics", industry: "Plastic products", subIndustry: "PVC pipes & fittings", score: 5, points: 3 },
  { sector: "Rubber & Plastics", industry: "Plastic products", subIndustry: "Plastic films & sheets", score: 5, points: 3 },

  // Pulp, Paper & Packaging
  { sector: "Pulp, Paper & Packaging", industry: "Pulp & paper", subIndustry: "Pulp mills", score: 4, points: 4 },
  { sector: "Pulp, Paper & Packaging", industry: "Pulp & paper", subIndustry: "Paper mills", score: 4, points: 4 },
  { sector: "Pulp, Paper & Packaging", industry: "Pulp & paper", subIndustry: "Tissue & hygiene products", score: 4, points: 4 },
  { sector: "Pulp, Paper & Packaging", industry: "Packaging", subIndustry: "Corrugated boxes", score: 5, points: 3 },
  { sector: "Pulp, Paper & Packaging", industry: "Packaging", subIndustry: "Flexible packaging", score: 4, points: 4 },
  { sector: "Pulp, Paper & Packaging", industry: "Packaging", subIndustry: "Rigid packaging", score: 5, points: 3 },
  { sector: "Pulp, Paper & Packaging", industry: "Printing", subIndustry: "Commercial printing", score: 6, points: 2 },
  { sector: "Pulp, Paper & Packaging", industry: "Printing", subIndustry: "Packaging printing", score: 5, points: 3 },

  // Healthcare & Pharmaceuticals
  { sector: "Healthcare & Pharmaceuticals", industry: "Hospitals & clinics", subIndustry: "Private hospitals", score: 2, points: 5 },
  { sector: "Healthcare & Pharmaceuticals", industry: "Hospitals & clinics", subIndustry: "Specialty clinics", score: 3, points: 5 },
  { sector: "Healthcare & Pharmaceuticals", industry: "Hospitals & clinics", subIndustry: "Medical laboratories", score: 3, points: 5 },
  { sector: "Healthcare & Pharmaceuticals", industry: "Pharmaceutical manufacturing", subIndustry: "Generic drugs", score: 3, points: 5 },
  { sector: "Healthcare & Pharmaceuticals", industry: "Pharmaceutical manufacturing", subIndustry: "OTC products", score: 4, points: 4 },
  { sector: "Healthcare & Pharmaceuticals", industry: "Medical devices", subIndustry: "Medical equipment", score: 3, points: 5 },
  { sector: "Healthcare & Pharmaceuticals", industry: "Medical devices", subIndustry: "Disposable medical supplies", score: 4, points: 4 },

  // Retail & Consumer
  { sector: "Retail & Consumer", industry: "Modern retail", subIndustry: "Hypermarkets & supermarkets", score: 3, points: 5 },
  { sector: "Retail & Consumer", industry: "Modern retail", subIndustry: "Convenience stores", score: 3, points: 5 },
  { sector: "Retail & Consumer", industry: "Modern retail", subIndustry: "Department stores", score: 4, points: 4 },
  { sector: "Retail & Consumer", industry: "Shopping centers", subIndustry: "Shopping malls", score: 3, points: 5 },
  { sector: "Retail & Consumer", industry: "Shopping centers", subIndustry: "Community malls", score: 4, points: 4 },
  { sector: "Retail & Consumer", industry: "Specialty retail", subIndustry: "Home improvement stores", score: 4, points: 4 },
  { sector: "Retail & Consumer", industry: "Specialty retail", subIndustry: "Electronics retailers", score: 5, points: 3 },
  { sector: "Retail & Consumer", industry: "E-commerce & logistics", subIndustry: "E-commerce platforms", score: 3, points: 5 },
  { sector: "Retail & Consumer", industry: "E-commerce & logistics", subIndustry: "Fulfillment centers", score: 3, points: 5 },
  { sector: "Retail & Consumer", industry: "E-commerce & logistics", subIndustry: "Last-mile delivery", score: 4, points: 4 },

  // Hospitality & Tourism
  { sector: "Hospitality & Tourism", industry: "Hotels & resorts", subIndustry: "Luxury hotels", score: 4, points: 4 },
  { sector: "Hospitality & Tourism", industry: "Hotels & resorts", subIndustry: "Business hotels", score: 4, points: 4 },
  { sector: "Hospitality & Tourism", industry: "Hotels & resorts", subIndustry: "Budget hotels", score: 5, points: 3 },
  { sector: "Hospitality & Tourism", industry: "Hotels & resorts", subIndustry: "Resorts & spas", score: 4, points: 4 },
  { sector: "Hospitality & Tourism", industry: "Food service", subIndustry: "Restaurant chains", score: 5, points: 3 },
  { sector: "Hospitality & Tourism", industry: "Food service", subIndustry: "Quick service restaurants", score: 4, points: 4 },
  { sector: "Hospitality & Tourism", industry: "Food service", subIndustry: "Catering services", score: 5, points: 3 },
  { sector: "Hospitality & Tourism", industry: "Entertainment", subIndustry: "Theme parks", score: 4, points: 4 },
  { sector: "Hospitality & Tourism", industry: "Entertainment", subIndustry: "Cinemas & theaters", score: 5, points: 3 },

  // Transportation & Logistics
  { sector: "Transportation & Logistics", industry: "Road transport", subIndustry: "Trucking & freight", score: 5, points: 3 },
  { sector: "Transportation & Logistics", industry: "Road transport", subIndustry: "Bus operators", score: 5, points: 3 },
  { sector: "Transportation & Logistics", industry: "Maritime", subIndustry: "Shipping lines", score: 4, points: 4 },
  { sector: "Transportation & Logistics", industry: "Maritime", subIndustry: "Port operators", score: 3, points: 5 },
  { sector: "Transportation & Logistics", industry: "Maritime", subIndustry: "Shipyards", score: 5, points: 3 },
  { sector: "Transportation & Logistics", industry: "Aviation", subIndustry: "Airlines", score: 4, points: 4 },
  { sector: "Transportation & Logistics", industry: "Aviation", subIndustry: "Airport services", score: 3, points: 5 },
  { sector: "Transportation & Logistics", industry: "Rail", subIndustry: "Rail operators", score: 3, points: 5 },
  { sector: "Transportation & Logistics", industry: "Rail", subIndustry: "Rail infrastructure", score: 3, points: 5 },
  { sector: "Transportation & Logistics", industry: "Warehousing & logistics", subIndustry: "3PL providers", score: 4, points: 4 },
  { sector: "Transportation & Logistics", industry: "Warehousing & logistics", subIndustry: "Cold chain logistics", score: 3, points: 5 },

  // Energy & Utilities
  { sector: "Energy & Utilities", industry: "Power generation", subIndustry: "IPP - thermal", score: 2, points: 5 },
  { sector: "Energy & Utilities", industry: "Power generation", subIndustry: "IPP - renewable", score: 2, points: 5 },
  { sector: "Energy & Utilities", industry: "Power generation", subIndustry: "Cogeneration", score: 3, points: 5 },
  { sector: "Energy & Utilities", industry: "Power distribution", subIndustry: "Distribution utilities", score: 2, points: 5 },
  { sector: "Energy & Utilities", industry: "Power distribution", subIndustry: "Industrial estates (utilities)", score: 3, points: 5 },
  { sector: "Energy & Utilities", industry: "Oil & gas", subIndustry: "Upstream E&P", score: 2, points: 5 },
  { sector: "Energy & Utilities", industry: "Oil & gas", subIndustry: "Gas distribution", score: 2, points: 5 },
  { sector: "Energy & Utilities", industry: "Oil & gas", subIndustry: "Fuel retail", score: 3, points: 5 },
  { sector: "Energy & Utilities", industry: "Water & waste", subIndustry: "Water treatment", score: 3, points: 5 },
  { sector: "Energy & Utilities", industry: "Water & waste", subIndustry: "Waste management", score: 4, points: 4 },
  { sector: "Energy & Utilities", industry: "Water & waste", subIndustry: "Recycling facilities", score: 4, points: 4 },

  // Real Estate & Property
  { sector: "Real Estate & Property", industry: "Residential", subIndustry: "Housing developers", score: 4, points: 4 },
  { sector: "Real Estate & Property", industry: "Residential", subIndustry: "Condominium developers", score: 4, points: 4 },
  { sector: "Real Estate & Property", industry: "Commercial", subIndustry: "Office buildings", score: 3, points: 5 },
  { sector: "Real Estate & Property", industry: "Commercial", subIndustry: "Retail properties", score: 4, points: 4 },
  { sector: "Real Estate & Property", industry: "Industrial", subIndustry: "Industrial estates", score: 3, points: 5 },
  { sector: "Real Estate & Property", industry: "Industrial", subIndustry: "Warehouses & logistics parks", score: 3, points: 5 },
  { sector: "Real Estate & Property", industry: "Industrial", subIndustry: "Factory buildings", score: 4, points: 4 },

  // Financial Services
  { sector: "Financial Services", industry: "Banking", subIndustry: "Commercial banks", score: 1, points: 5 },
  { sector: "Financial Services", industry: "Banking", subIndustry: "Specialized banks", score: 2, points: 5 },
  { sector: "Financial Services", industry: "Non-bank financial", subIndustry: "Leasing companies", score: 3, points: 5 },
  { sector: "Financial Services", industry: "Non-bank financial", subIndustry: "Consumer finance", score: 4, points: 4 },
  { sector: "Financial Services", industry: "Insurance", subIndustry: "Life insurance", score: 2, points: 5 },
  { sector: "Financial Services", industry: "Insurance", subIndustry: "Non-life insurance", score: 2, points: 5 },
  { sector: "Financial Services", industry: "Capital markets", subIndustry: "Securities firms", score: 3, points: 5 },
  { sector: "Financial Services", industry: "Capital markets", subIndustry: "Asset management", score: 3, points: 5 },

  // Public Sector
  { sector: "Public Sector", industry: "Government", subIndustry: "Government offices", score: 1, points: 5 },
  { sector: "Public Sector", industry: "Government", subIndustry: "State enterprises", score: 1, points: 5 },
  { sector: "Public Sector", industry: "Government", subIndustry: "Military facilities", score: 2, points: 5 },
  { sector: "Public Sector", industry: "Education institutions", subIndustry: "Public universities", score: 3, points: 5 },
  { sector: "Public Sector", industry: "Education institutions", subIndustry: "Private universities", score: 3, points: 5 },
  { sector: "Public Sector", industry: "Education institutions", subIndustry: "International schools", score: 3, points: 5 },
  { sector: "Public Sector", industry: "Education institutions", subIndustry: "Vocational schools", score: 4, points: 4 },
  { sector: "Public Sector", industry: "Public healthcare", subIndustry: "Public hospitals", score: 2, points: 5 },
  { sector: "Public Sector", industry: "Public healthcare", subIndustry: "Health centers", score: 3, points: 5 },
];

// Helper function to get unique Sectors
export const getSectors = (): string[] => 
  Array.from(new Set(THAI_SECTOR_TAXONOMY.map(t => t.sector))).sort();

// Helper function to get Industries for a specific Sector
export const getIndustries = (sector: string): string[] => 
  Array.from(new Set(
    THAI_SECTOR_TAXONOMY
      .filter(t => t.sector === sector)
      .map(t => t.industry)
  )).sort();

// Helper function to get Sub-Industries for a specific Industry
export const getSubIndustries = (industry: string): { name: string; score: number; points: number }[] => 
  THAI_SECTOR_TAXONOMY
    .filter(t => t.industry === industry)
    .map(t => ({ name: t.subIndustry, score: t.score, points: t.points }))
    .sort((a, b) => a.name.localeCompare(b.name));

// Helper function to get taxonomy info by sub-industry
export const getTaxonomyInfo = (subIndustry: string): TaxonomyEntry | undefined =>
  THAI_SECTOR_TAXONOMY.find(t => t.subIndustry === subIndustry);

// Helper function to get full taxonomy by any level
export const findTaxonomy = (sector?: string, industry?: string, subIndustry?: string): TaxonomyEntry | undefined => {
  if (subIndustry) {
    return THAI_SECTOR_TAXONOMY.find(t => t.subIndustry === subIndustry);
  }
  if (industry) {
    return THAI_SECTOR_TAXONOMY.find(t => t.industry === industry);
  }
  if (sector) {
    return THAI_SECTOR_TAXONOMY.find(t => t.sector === sector);
  }
  return undefined;
};

// Sector icons for UI display
export const SECTOR_ICONS: Record<string, string> = {
  "Agriculture & Agribusiness": "🌾",
  "Food & Beverage Manufacturing": "🍜",
  "Automotive & Parts": "🚗",
  "Technology & Electronics/ICT": "💻",
  "Petrochemicals & Chemicals": "🧪",
  "Textiles & Apparel": "👔",
  "Steel & Metals": "⚙️",
  "Building Materials & Construction": "🏗️",
  "Rubber & Plastics": "🔧",
  "Pulp, Paper & Packaging": "📦",
  "Healthcare & Pharmaceuticals": "🏥",
  "Retail & Consumer": "🛒",
  "Hospitality & Tourism": "🏨",
  "Transportation & Logistics": "🚚",
  "Energy & Utilities": "⚡",
  "Real Estate & Property": "🏢",
  "Financial Services": "🏦",
  "Public Sector": "🏛️",
};

// Credit score color mapping
export const getScoreColor = (score: number): string => {
  if (score <= 2) return 'text-emerald-600 bg-emerald-50';
  if (score <= 4) return 'text-blue-600 bg-blue-50';
  if (score <= 6) return 'text-amber-600 bg-amber-50';
  if (score <= 8) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
};

// Priority points color mapping
export const getPointsColor = (points: number): string => {
  if (points >= 5) return 'text-emerald-600 bg-emerald-50';
  if (points >= 4) return 'text-blue-600 bg-blue-50';
  if (points >= 3) return 'text-amber-600 bg-amber-50';
  return 'text-gray-600 bg-gray-50';
};
