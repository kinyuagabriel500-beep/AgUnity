ENTERPRISE_TEMPLATES = [
    {
        "type": "livestock",
        "subtype": "dairy",
        "name": "Dairy Farming",
        "lifecycle_stages": ["calving", "lactation", "dry_period"],
        "default_calendar": [
            {"task": "Milking", "frequency": "daily", "times": ["06:00", "18:00"]},
            {"task": "Feeding", "frequency": "daily", "times": ["07:00", "17:00"]},
            {"task": "Health Check", "frequency": "weekly"},
            {"task": "Breeding Monitoring", "frequency": "monthly"}
        ],
        "required_inputs": ["feed", "water", "veterinary"],
        "expected_outputs": ["milk", "manure"],
        "kpis": ["milk_yield_per_cow", "feed_cost_ratio"],
        "ai_rules": [
            "If milk yield drops > 10 percent then trigger health alert",
            "If feed cost rises then suggest lower-cost alternatives"
        ]
    },
    {
        "type": "livestock",
        "subtype": "beef_cattle",
        "name": "Beef Cattle",
        "lifecycle_stages": ["weaning", "growing", "fattening", "market"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily", "times": ["07:00", "17:00"]},
            {"task": "Water Check", "frequency": "daily"},
            {"task": "Weight Monitoring", "frequency": "weekly"},
            {"task": "Deworming", "frequency": "monthly"}
        ],
        "required_inputs": ["feed", "water", "supplements"],
        "expected_outputs": ["beef"],
        "kpis": ["weight_gain", "feed_conversion_ratio"],
        "ai_rules": ["If weight gain slows then optimize feed plan"]
    },
    {
        "type": "livestock",
        "subtype": "goat",
        "name": "Goat Farming",
        "lifecycle_stages": ["breeding", "kidding", "growing"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily"},
            {"task": "Watering", "frequency": "daily"},
            {"task": "Health Check", "frequency": "weekly"}
        ],
        "required_inputs": ["feed", "water", "veterinary"],
        "expected_outputs": ["meat", "milk"],
        "kpis": ["kid_survival_rate", "weight_gain"],
        "ai_rules": ["If kid mortality rises then trigger veterinary check"]
    },
    {
        "type": "livestock",
        "subtype": "sheep",
        "name": "Sheep Farming",
        "lifecycle_stages": ["lambing", "growth", "finishing"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily"},
            {"task": "Wool and body check", "frequency": "weekly"},
            {"task": "Vaccination", "frequency": "monthly"}
        ],
        "required_inputs": ["feed", "water", "veterinary"],
        "expected_outputs": ["meat", "wool"],
        "kpis": ["lamb_survival_rate", "weight_gain"],
        "ai_rules": ["If grazing quality drops then recommend supplementation"]
    },
    {
        "type": "livestock",
        "subtype": "pig_farming",
        "name": "Pig Farming",
        "lifecycle_stages": ["weaning", "growing", "fattening"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily", "times": ["07:00", "17:00"]},
            {"task": "Pen Cleaning", "frequency": "daily"},
            {"task": "Health Check", "frequency": "weekly"}
        ],
        "required_inputs": ["piglets", "feed", "water"],
        "expected_outputs": ["pork"],
        "kpis": ["weight_gain", "feed_efficiency"],
        "ai_rules": ["If feed efficiency worsens then rebalance rations"]
    },
    {
        "type": "livestock",
        "subtype": "poultry_broilers",
        "name": "Poultry Broilers",
        "lifecycle_stages": ["brooding", "starter", "grower", "finisher", "sale"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily", "times": ["08:00", "16:00"]},
            {"task": "Water Check", "frequency": "daily"},
            {"task": "Vaccination", "day": 7},
            {"task": "Vaccination", "day": 14},
            {"task": "Sale", "day": 42}
        ],
        "required_inputs": ["chicks", "feed", "vaccines"],
        "expected_outputs": ["meat"],
        "kpis": ["mortality_rate", "feed_conversion_ratio"],
        "ai_rules": [
            "If mortality exceeds 5 percent then trigger urgent alert",
            "If ambient temperature drops then recommend heating"
        ]
    },
    {
        "type": "livestock",
        "subtype": "poultry_layers",
        "name": "Poultry Layers",
        "lifecycle_stages": ["brooding", "grower", "laying"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily", "times": ["07:30", "16:30"]},
            {"task": "Egg Collection", "frequency": "daily", "times": ["10:00", "14:00", "17:00"]},
            {"task": "Vaccination", "frequency": "monthly"}
        ],
        "required_inputs": ["pullets", "feed", "vaccines"],
        "expected_outputs": ["eggs"],
        "kpis": ["egg_rate", "mortality_rate"],
        "ai_rules": ["If egg rate declines then inspect nutrition and lighting"]
    },
    {
        "type": "livestock",
        "subtype": "poultry_kienyeji",
        "name": "Kienyeji Chicken",
        "lifecycle_stages": ["brooding", "free_range_growth", "laying_or_sale"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily"},
            {"task": "Water Check", "frequency": "daily"},
            {"task": "Parasite Control", "frequency": "monthly"}
        ],
        "required_inputs": ["chicks", "feed", "vaccines"],
        "expected_outputs": ["eggs", "meat"],
        "kpis": ["survival_rate", "egg_rate"],
        "ai_rules": ["If parasite pressure rises then trigger control advisory"]
    },
    {
        "type": "aquaculture",
        "subtype": "tilapia",
        "name": "Fish Farming Tilapia",
        "lifecycle_stages": ["stocking", "growing", "harvest"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily", "times": ["09:00", "15:00"]},
            {"task": "Water Quality Check", "frequency": "daily"},
            {"task": "Growth Sampling", "frequency": "weekly"},
            {"task": "Harvest", "day": 180}
        ],
        "required_inputs": ["fingerlings", "feed", "water_quality_supplies"],
        "expected_outputs": ["fish"],
        "kpis": ["growth_rate", "survival_rate"],
        "ai_rules": ["If oxygen risk rises then trigger aeration alert"]
    },
    {
        "type": "aquaculture",
        "subtype": "catfish",
        "name": "Fish Farming Catfish",
        "lifecycle_stages": ["stocking", "growing", "harvest"],
        "default_calendar": [
            {"task": "Feeding", "frequency": "daily"},
            {"task": "Water Quality Check", "frequency": "daily"},
            {"task": "Harvest", "day": 210}
        ],
        "required_inputs": ["fingerlings", "feed", "water"],
        "expected_outputs": ["fish"],
        "kpis": ["growth_rate", "survival_rate"],
        "ai_rules": ["If growth is slow then optimize feed regime"]
    },
    {
        "type": "crop",
        "subtype": "maize",
        "name": "Maize Farming",
        "lifecycle_stages": ["land_preparation", "planting", "vegetative", "reproductive", "harvest"],
        "default_calendar": [
            {"task": "Land Preparation", "week": 1},
            {"task": "Planting", "week": 2},
            {"task": "Top Dressing", "week": 6},
            {"task": "Pest Scouting", "frequency": "weekly"},
            {"task": "Harvest", "week": 16}
        ],
        "required_inputs": ["seed", "fertilizer", "labor"],
        "expected_outputs": ["grain"],
        "kpis": ["yield_per_ha", "input_cost_ratio"],
        "ai_rules": ["If rainfall forecast is high then delay spraying"]
    },
    {
        "type": "crop",
        "subtype": "rice",
        "name": "Rice Farming",
        "lifecycle_stages": ["land_preparation", "transplanting", "growth", "harvest"],
        "default_calendar": [
            {"task": "Land Preparation", "week": 1},
            {"task": "Transplanting", "week": 2},
            {"task": "Fertilizer Application", "week": 6},
            {"task": "Water Management", "frequency": "daily"},
            {"task": "Harvest", "week": 12}
        ],
        "required_inputs": ["seedlings", "fertilizer", "water"],
        "expected_outputs": ["rice"],
        "kpis": ["yield_per_ha", "water_use_efficiency"],
        "ai_rules": ["If rainfall is high then reduce irrigation"]
    },
    {
        "type": "crop",
        "subtype": "wheat",
        "name": "Wheat Farming",
        "lifecycle_stages": ["land_preparation", "sowing", "growth", "harvest"],
        "default_calendar": [
            {"task": "Land Preparation", "week": 1},
            {"task": "Sowing", "week": 2},
            {"task": "Fertilizer Application", "week": 5},
            {"task": "Harvest", "week": 18}
        ],
        "required_inputs": ["seed", "fertilizer", "labor"],
        "expected_outputs": ["wheat"],
        "kpis": ["yield_per_ha"],
        "ai_rules": ["If disease risk rises then trigger fungicide advisory"]
    },
    {
        "type": "crop",
        "subtype": "potatoes",
        "name": "Potato Farming",
        "lifecycle_stages": ["land_preparation", "planting", "tuber_development", "harvest"],
        "default_calendar": [
            {"task": "Planting", "week": 1},
            {"task": "Hilling", "week": 4},
            {"task": "Fertilizer Application", "week": 5},
            {"task": "Harvest", "week": 14}
        ],
        "required_inputs": ["seed_tubers", "fertilizer", "fungicide"],
        "expected_outputs": ["potatoes"],
        "kpis": ["yield_per_ha", "quality_grade"],
        "ai_rules": ["If late blight risk rises then recommend preventive action"]
    },
    {
        "type": "crop",
        "subtype": "beans",
        "name": "Bean Farming",
        "lifecycle_stages": ["land_preparation", "planting", "flowering", "harvest"],
        "default_calendar": [
            {"task": "Planting", "week": 1},
            {"task": "Weeding", "week": 3},
            {"task": "Pest Scouting", "frequency": "weekly"},
            {"task": "Harvest", "week": 11}
        ],
        "required_inputs": ["seed", "fertilizer", "labor"],
        "expected_outputs": ["beans"],
        "kpis": ["yield_per_ha"],
        "ai_rules": ["If flowering stress is high then prioritize moisture conservation"]
    },
    {
        "type": "horticulture",
        "subtype": "avocado",
        "name": "Avocado Farming",
        "lifecycle_stages": ["flowering", "fruiting", "harvest"],
        "default_calendar": [
            {"task": "Pruning", "frequency": "quarterly"},
            {"task": "Fertilization", "frequency": "biannual"},
            {"task": "Pest Scouting", "frequency": "weekly"},
            {"task": "Harvest", "frequency": "annual"}
        ],
        "required_inputs": ["fertilizer", "water", "plant_protection"],
        "expected_outputs": ["avocado"],
        "kpis": ["yield_per_tree", "export_grade_rate"],
        "ai_rules": ["If flowering is weak then recommend nutrition adjustment"]
    },
    {
        "type": "horticulture",
        "subtype": "mango",
        "name": "Mango Farming",
        "lifecycle_stages": ["flowering", "fruiting", "harvest"],
        "default_calendar": [
            {"task": "Pruning", "frequency": "quarterly"},
            {"task": "Fertilization", "frequency": "biannual"},
            {"task": "Harvest", "frequency": "annual"}
        ],
        "required_inputs": ["fertilizer", "water"],
        "expected_outputs": ["mango"],
        "kpis": ["yield_per_tree"],
        "ai_rules": ["If fruit fly risk rises then trigger integrated pest management"]
    },
    {
        "type": "horticulture",
        "subtype": "banana",
        "name": "Banana Farming",
        "lifecycle_stages": ["establishment", "vegetative", "fruiting", "harvest"],
        "default_calendar": [
            {"task": "De-suckering", "frequency": "monthly"},
            {"task": "Fertilization", "frequency": "monthly"},
            {"task": "Irrigation Check", "frequency": "weekly"},
            {"task": "Harvest", "frequency": "monthly"}
        ],
        "required_inputs": ["plantlets", "fertilizer", "water"],
        "expected_outputs": ["banana"],
        "kpis": ["bunch_weight", "yield_per_ha"],
        "ai_rules": ["If leaf disease incidence rises then trigger rapid treatment"]
    },
    {
        "type": "horticulture",
        "subtype": "vegetables",
        "name": "Vegetable Farming",
        "lifecycle_stages": ["nursery", "transplant", "growth", "harvest"],
        "default_calendar": [
            {"task": "Nursery Setup", "week": 1},
            {"task": "Transplanting", "week": 3},
            {"task": "Irrigation", "frequency": "daily"},
            {"task": "Pest Scouting", "frequency": "weekly"},
            {"task": "Harvest", "week": 9}
        ],
        "required_inputs": ["seedlings", "fertilizer", "water"],
        "expected_outputs": ["vegetables"],
        "kpis": ["marketable_yield", "rejection_rate"],
        "ai_rules": ["If heat stress is high then adjust irrigation timing"]
    },
    {
        "type": "tree_crop",
        "subtype": "coconut",
        "name": "Coconut Farming",
        "lifecycle_stages": ["growth", "maturity", "harvest"],
        "default_calendar": [
            {"task": "Fertilization", "frequency": "annual"},
            {"task": "Pest Scouting", "frequency": "monthly"},
            {"task": "Harvest", "frequency": "quarterly"}
        ],
        "required_inputs": ["fertilizer", "labor"],
        "expected_outputs": ["coconut"],
        "kpis": ["nuts_per_tree"],
        "ai_rules": ["If nut yield drops then recommend soil and nutrient diagnostics"]
    },
    {
        "type": "tree_crop",
        "subtype": "coffee",
        "name": "Coffee Farming",
        "lifecycle_stages": ["flowering", "cherry_development", "harvest"],
        "default_calendar": [
            {"task": "Pruning", "frequency": "annual"},
            {"task": "Fertilization", "frequency": "biannual"},
            {"task": "Harvest", "frequency": "annual"}
        ],
        "required_inputs": ["fertilizer", "labor", "plant_protection"],
        "expected_outputs": ["coffee_cherry"],
        "kpis": ["yield_per_tree", "cup_quality_score"],
        "ai_rules": ["If rust risk increases then trigger disease advisory"]
    },
    {
        "type": "tree_crop",
        "subtype": "tea",
        "name": "Tea Farming",
        "lifecycle_stages": ["vegetative", "plucking_cycle"],
        "default_calendar": [
            {"task": "Plucking", "frequency": "weekly"},
            {"task": "Fertilization", "frequency": "quarterly"},
            {"task": "Pest Scouting", "frequency": "weekly"}
        ],
        "required_inputs": ["fertilizer", "labor"],
        "expected_outputs": ["green_leaf"],
        "kpis": ["leaf_yield_per_ha"],
        "ai_rules": ["If plucking intervals are delayed then quality risk rises"]
    },
    {
        "type": "tree_crop",
        "subtype": "macadamia",
        "name": "Macadamia Farming",
        "lifecycle_stages": ["flowering", "nut_set", "harvest"],
        "default_calendar": [
            {"task": "Fertilization", "frequency": "biannual"},
            {"task": "Pruning", "frequency": "annual"},
            {"task": "Harvest", "frequency": "annual"}
        ],
        "required_inputs": ["fertilizer", "labor"],
        "expected_outputs": ["macadamia_nuts"],
        "kpis": ["kernel_recovery_rate", "yield_per_tree"],
        "ai_rules": ["If nut drop is high then check moisture and nutrition"]
    },
    {
        "type": "specialized",
        "subtype": "beekeeping",
        "name": "Beekeeping",
        "lifecycle_stages": ["hive_setup", "honey_flow", "harvest"],
        "default_calendar": [
            {"task": "Hive Inspection", "frequency": "monthly"},
            {"task": "Pest and Disease Check", "frequency": "monthly"},
            {"task": "Honey Harvest", "frequency": "biannual"}
        ],
        "required_inputs": ["hives", "protective_gear"],
        "expected_outputs": ["honey", "wax"],
        "kpis": ["honey_yield"],
        "ai_rules": ["If hive activity declines then trigger inspection advisory"]
    },
    {
        "type": "specialized",
        "subtype": "greenhouse",
        "name": "Greenhouse Farming",
        "lifecycle_stages": ["setup", "planting", "growth", "harvest"],
        "default_calendar": [
            {"task": "Climate Monitoring", "frequency": "daily"},
            {"task": "Irrigation", "frequency": "daily"},
            {"task": "Nutrient Dosing", "frequency": "weekly"},
            {"task": "Pest Scouting", "frequency": "weekly"}
        ],
        "required_inputs": ["seedlings", "nutrients", "water", "energy"],
        "expected_outputs": ["high_value_produce"],
        "kpis": ["yield_per_m2", "resource_use_efficiency"],
        "ai_rules": ["If humidity is high then increase ventilation"]
    },
    {
        "type": "specialized",
        "subtype": "hydroponics",
        "name": "Hydroponics",
        "lifecycle_stages": ["system_setup", "transplant", "growth", "harvest"],
        "default_calendar": [
            {"task": "Nutrient Solution Check", "frequency": "daily"},
            {"task": "pH and EC Check", "frequency": "daily"},
            {"task": "System Cleaning", "frequency": "weekly"}
        ],
        "required_inputs": ["nutrients", "water", "energy", "seedlings"],
        "expected_outputs": ["leafy_greens", "herbs"],
        "kpis": ["yield_per_cycle", "nutrient_efficiency"],
        "ai_rules": ["If pH drifts then auto-recommend nutrient adjustment"]
    }
]


def get_template(enterprise_type: str, subtype: str) -> dict | None:
    target_type = str(enterprise_type or "").strip().lower()
    target_subtype = str(subtype or "").strip().lower()
    for template in ENTERPRISE_TEMPLATES:
        if template["type"].lower() == target_type and template["subtype"].lower() == target_subtype:
            return template
    return None
