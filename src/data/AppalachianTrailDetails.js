const appalachianTrailDetails = [
  {
    "Day 1": {
      date: "4/1/2014",
      startingLocation: "Amicalola Falls",
      endingLocation: "Springer Mountain Shelter",
      startingCoordinates: [34.5607, -84.248],
      endingCoordinates: [34.62951117990281, -84.19267417323803],
      state: "Georgia",
    },
  },
  {
    "Day 2": {
      date: "4/2/2014",
      startingLocation: "Springer Mountain Shelter",
      endingLocation: "Hawk Mountain Shelter",
      startingCoordinates: [34.62951117990281, -84.19267417323803],
      endingCoordinates: [34.66620061252325, -84.13640405974544],
      state: "Georgia",
    },
  },
  {
    "Day 3": {
      date: "4/3/2014",
      startingLocation: "Hawk Mountain Shelter",
      endingLocation: "Gooch Gap",
      startingCoordinates: [34.66620061252325, -84.13640405974544],
      endingCoordinates: [34.6521730395017, -84.0322702502148],
      state: "Georgia",
    },
  },
  {
    "Day 4": {
      date: "4/4/2014",
      startingLocation: "Gooch Gap",
      endingLocation: "Lance Creek",
      startingCoordinates: [34.6521730395017, -84.0322702502148],
      endingCoordinates: [34.70820668941287, -83.98491493091524],
      state: "Georgia",
    },
  },
  {
    "Day 5": {
      date: "4/5/2014",
      startingLocation: "Lance Creek",
      endingLocation: "Neels Gap",
      startingCoordinates: [34.70820668941287, -83.98491493091524],
      endingCoordinates: [34.73544076969417, -83.9180001007228],
      state: "Georgia",
    },
  },
  {
    "Day 6": {
      date: "4/6/2014",
      startingLocation: "Neels Gap",
      endingLocation: "Low Gap Shelter",
      startingCoordinates: [34.73544076969417, -83.9180001007228],
      endingCoordinates: [34.77629640515657, -83.82439623227174],
      state: "Georgia",
    },
  },
  {
    "Day 7": {
      date: "4/7/2014",
      startingLocation: "Low Gap Shelter",
      endingLocation: "Blue Mountain Shelter",
      startingCoordinates: [34.77629640515657, -83.82439623227174],
      endingCoordinates: [34.81731594369318, -83.76676483090553],
      state: "Georgia",
    },
  },
  {
    "Day 8": {
      date: "4/8/2014",
      startingLocation: "Blue Mountain Shelter",
      endingLocation: "Deep Gap Shelter",
      startingCoordinates: [34.81731594369318, -83.76676483090553],
      endingCoordinates: [34.8824, -83.6461],
      state: "Georgia",
    },
  },
  {
    "Day 9": {
      date: "4/9/2014",
      startingLocation: "Deep Gap Shelter",
      endingLocation: "Dicks Creek Gap",
      startingCoordinates: [34.8824, -83.6461],
      endingCoordinates: [34.91205111466465, -83.61904666848635],
      state: "Georgia",
    },
  },
  {
    "Day 10": {
      date: "4/10/2014",
      startingLocation: "Dicks Creek Gap",
      endingLocation: "Muskrat Creek Shelter",
      startingCoordinates: [34.91205111466465, -83.61904666848635],
      endingCoordinates: [35.02068137252565, -83.5814816513152],
      state: "Georgia, North Carolina",
    },
  },
  {
    "Day 11": {
      date: "4/11/2014",
      startingLocation: "Muskrat Creek Shelter",
      endingLocation: "Carter Gap Shelter",
      startingCoordinates: [35.02068137252565, -83.5814816513152],
      endingCoordinates: [34.999407877768725, -83.49389805358915],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 12": {
      date: "4/12/2014",
      startingLocation: "Carter Gap Shelter",
      endingLocation: "Rock Gap Shelter",
      startingCoordinates: [34.999407877768725, -83.49389805358915],
      endingCoordinates: [35.0915935254672, -83.52294766000716],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 13": {
      date: "4/13/2014",
      startingLocation: "Rock Gap Shelter",
      endingLocation: "Winding Stair Gap (Franklin, NC)",
      startingCoordinates: [35.0915935254672, -83.52294766000716],
      endingCoordinates: [35.12161950106376, -83.54475495121724],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 14": {
      date: "4/14/2014",
      startingLocation: "Winding Stair Gap (Franklin, NC)",
      endingLocation: "Siler Bald Shelter",
      startingCoordinates: [35.12161950106376, -83.54475495121724],
      endingCoordinates: [35.14426746041196, -83.57341471740558],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 15": {
      date: "4/15/2014",
      startingLocation: "Siler Bald Shelter",
      endingLocation: "Burningtown Gap",
      startingCoordinates: [35.14426746041196, -83.57341471740558],
      endingCoordinates: [35.22308887353577, -83.56237706742218],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 16": {
      date: "4/16/2014",
      startingLocation: "Burningtown Gap",
      endingLocation: "Nantahala Outdoor Center",
      startingCoordinates: [35.22308887353577, -83.56237706742218],
      endingCoordinates: [35.33139316380414, -83.59166342673153],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 17": {
      date: "4/17/2014",
      startingLocation: "Nantahala Outdoor Center",
      endingLocation: "Locust Cove Gap",
      startingCoordinates: [35.33139316380414, -83.59166342673153],
      endingCoordinates: [35.33439051589019, -83.70383529821093],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 18": {
      date: "4/18/2014",
      startingLocation: "Locust Cove Gap",
      endingLocation: "Cable Gap Shelter",
      startingCoordinates: [35.33439051589019, -83.70383529821093],
      endingCoordinates: [35.41537961577501, -83.77343373089025],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 19": {
      date: "4/19/2014",
      startingLocation: "Cable Gap Shelter",
      endingLocation: "Fontana Village Resort",
      startingCoordinates: [35.41537961577501, -83.77343373089025],
      endingCoordinates: [35.43267640017142, -83.82137957321751],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 20": {
      date: "4/20/2014",
      startingLocation: "Fontana Village Resort",
      endingLocation: "Fontana Village Resort",
      startingCoordinates: [35.43267640017142, -83.82137957321751],
      endingCoordinates: [35.43267640017142, -83.82137957321751],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 21": {
      date: "4/21/2014",
      startingLocation: "Fontana Village Resort",
      endingLocation: "Birch Spring Gap",
      startingCoordinates: [35.43267640017142, -83.82137957321751],
      endingCoordinates: [35.5015124884789, -83.81323492728795],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 22": {
      date: "4/22/2014",
      startingLocation: "Birch Spring Gap",
      endingLocation: "Spence Field Shelter",
      startingCoordinates: [35.5015124884789, -83.81323492728795],
      endingCoordinates: [35.56186824065446, -83.73266854300489],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 23": {
      date: "4/23/2014",
      startingLocation: "Spence Field Shelter",
      endingLocation: "Double Spring Shelter",
      startingCoordinates: [35.56186824065446, -83.73266854300489],
      endingCoordinates: [35.56523880313199, -83.5424411028276],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 24": {
      date: "4/24/2014",
      startingLocation: "Double Spring Shelter",
      endingLocation: "Newfound Gap (Gatlinburg, TN)",
      startingCoordinates: [35.56523880313199, -83.5424411028276],
      endingCoordinates: [35.61122424630325, -83.42529802295039],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 25": {
      date: "4/25/2014",
      startingLocation: "Newfound Gap (Gatlinburg, TN)",
      endingLocation: "Pecks Corner Shelter",
      startingCoordinates: [35.61122424630325, -83.42529802295039],
      endingCoordinates: [35.650960579860154, -83.30856978855638],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 26": {
      date: "4/26/2014",
      startingLocation: "Pecks Corner Shelter",
      endingLocation: "Cosby Knob Shelter",
      startingCoordinates: [35.650960579860154, -83.30856978855638],
      endingCoordinates: [35.728450535926484, -83.1820231732099],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 27": {
      date: "4/27/2014",
      startingLocation: "Cosby Knob Shelter",
      endingLocation: "Green Corner Road (Standing Bear Farm)",
      startingCoordinates: [35.728450535926484, -83.1820231732099],
      endingCoordinates: [35.782733769401524, -83.10193043829243],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 28": {
      date: "4/28/2014",
      startingLocation: "Green Corner Road (Standing Bear Farm)",
      endingLocation: "Max Patch Campsite",
      startingCoordinates: [35.782733769401524, -83.10193043829243],
      endingCoordinates: [35.79717201418794, -82.95680952201006],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 29": {
      date: "4/29/2014",
      startingLocation: "Max Patch Campsite",
      endingLocation: "Hot Springs, NC",
      startingCoordinates: [35.79717201418794, -82.95680952201006],
      endingCoordinates: [35.89261027983853, -82.82774986823483],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 30": {
      date: "4/30/2014",
      startingLocation: "Hot Springs, NC",
      endingLocation: "Hot Springs, NC",
      startingCoordinates: [35.89261027983853, -82.82774986823483],
      endingCoordinates: [35.89261027983853, -82.82774986823483],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 31": {
      date: "5/1/2014",
      startingLocation: "Hot Springs, NC",
      endingLocation: "Just outside Hot Springs, NC",
      startingCoordinates: [35.89261027983853, -82.82774986823483],
      endingCoordinates: [35.89109636354551, -82.82117210153348],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 32": {
      date: "5/2/2014",
      startingLocation: "Just outside Hot Springs, NC",
      endingLocation: "Spring Mountain Shelter",
      startingCoordinates: [35.89109636354551, -82.82117210153348],
      endingCoordinates: [35.951881413302, -82.79009262195231],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 33": {
      date: "5/3/2014",
      startingLocation: "Spring Mountain Shelter",
      endingLocation: "Jerry Cabin Shelter",
      startingCoordinates: [35.951881413302, -82.79009262195231],
      endingCoordinates: [36.0566, -82.6571],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 34": {
      date: "5/4/2014",
      startingLocation: "Jerry Cabin Shelter",
      endingLocation: "Hogback Ridge Shelter",
      startingCoordinates: [36.0566, -82.6571],
      endingCoordinates: [35.9641, -82.5871],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 35": {
      date: "5/5/2014",
      startingLocation: "Hogback Ridge Shelter",
      endingLocation: "Spivey Gap",
      startingCoordinates: [35.9641, -82.5871],
      endingCoordinates: [36.0320687581757, -82.42032127974768],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 36": {
      date: "5/6/2014",
      startingLocation: "Spivey Gap",
      endingLocation: "Erwin, TN",
      startingCoordinates: [36.0320687581757, -82.42032127974768],
      endingCoordinates: [36.1054, -82.4483],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 37": {
      date: "5/7/2014",
      startingLocation: "Erwin, TN",
      endingLocation: "Curley Maple Gap Shelter",
      startingCoordinates: [36.1054, -82.4483],
      endingCoordinates: [36.1043, -82.3968],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 38": {
      date: "5/8/2014",
      startingLocation: "Curley Maple Gap Shelter",
      endingLocation: "Campsite just after Iron Mtn Gap",
      startingCoordinates: [36.1043, -82.3968],
      endingCoordinates: [36.144543767859396, -82.23130319447864],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 39": {
      date: "5/9/2014",
      startingLocation: "Campsite just after Iron Mtn Gap",
      endingLocation: "Roan Mountain Shelter",
      startingCoordinates: [36.144543767859396, -82.23130319447864],
      endingCoordinates: [36.10512263476555, -82.12213748729592],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 40": {
      date: "5/10/2014",
      startingLocation: "Roan Mountain Shelter",
      endingLocation: "US 19E",
      startingCoordinates: [36.10512263476555, -82.12213748729592],
      endingCoordinates: [36.17748910226034, -82.01174778866059],
      state: "North Carolina, Tennessee",
    },
  },
  {
    "Day 41": {
      date: "5/11/2014",
      startingLocation: "US 19E",
      endingLocation: "Upper Laurel Fork",
      startingCoordinates: [36.17748910226034, -82.01174778866059],
      endingCoordinates: [36.220537135425296, -82.02934671719292],
      state: "Tennessee",
    },
  },
  {
    "Day 42": {
      date: "5/12/2014",
      startingLocation: "Upper Laurel Fork",
      endingLocation: "Side Trail to US 321",
      startingCoordinates: [36.220537135425296, -82.02934671719292],
      endingCoordinates: [36.28285495010562, -82.14082688751832],
      state: "Tennessee",
    },
  },
  {
    "Day 43": {
      date: "5/13/2014",
      startingLocation: "Side Trail to US 321",
      endingLocation: "Watauga Lake Shelter",
      startingCoordinates: [36.28285495010562, -82.14082688751832],
      endingCoordinates: [36.31412237257887, -82.12937271359424],
      state: "Tennessee",
    },
  },
  {
    "Day 44": {
      date: "5/14/2014",
      startingLocation: "Watauga Lake Shelter",
      endingLocation: "Double Springs Shelter",
      startingCoordinates: [36.31412237257887, -82.12937271359424],
      endingCoordinates: [36.509937055732834, -81.98548873687238],
      state: "Tennessee",
    },
  },
  {
    "Day 45": {
      date: "5/15/2014",
      startingLocation: "Double Springs Shelter",
      endingLocation: "Damascus, VA",
      startingCoordinates: [36.509937055732834, -81.98548873687238],
      endingCoordinates: [36.6338, -81.7914],
      state: "Tennessee, Virginia",
    },
  },
  {
    "Day 46": {
      date: "5/16/2014",
      startingLocation: "Damascus, VA",
      endingLocation: "Damascus, VA",
      startingCoordinates: [36.6338, -81.7914],
      endingCoordinates: [36.6338, -81.7914],
      state: "Virginia",
    },
  },
  {
    "Day 47": {
      date: "5/17/2014",
      startingLocation: "Damascus, VA",
      endingLocation: "Damascus, VA",
      startingCoordinates: [36.6338, -81.7914],
      endingCoordinates: [36.6338, -81.7914],
      state: "Virginia",
    },
  },
  {
    "Day 48": {
      date: "5/18/2014",
      startingLocation: "Damascus, VA",
      endingLocation: "Damascus, VA",
      startingCoordinates: [36.6338, -81.7914],
      endingCoordinates: [36.6338, -81.7914],
      state: "Virginia",
    },
  },
  {
    "Day 49": {
      date: "5/19/2014",
      startingLocation: "Damascus, VA",
      endingLocation: "Lost Mountain Shelter",
      startingCoordinates: [36.6338, -81.7914],
      endingCoordinates: [36.6442, -81.6559],
      state: "Virginia",
    },
  },
  {
    "Day 50": {
      date: "5/20/2014",
      startingLocation: "Lost Mountain Shelter",
      endingLocation: "Thomas Knob Shelter",
      startingCoordinates: [36.6442, -81.6559],
      endingCoordinates: [36.6566, -81.5352],
      state: "Virginia",
    },
  },
  {
    "Day 51": {
      date: "5/21/2014",
      startingLocation: "Thomas Knob Shelter",
      endingLocation: "VA 603 Fox Creek",
      startingCoordinates: [36.6566, -81.5352],
      endingCoordinates: [36.69657190552609, -81.50626263852371],
      state: "Virginia",
    },
  },
  {
    "Day 52": {
      date: "5/22/2014",
      startingLocation: "VA 603 Fox Creek",
      endingLocation: "Marion, VA (slept across the street)",
      startingCoordinates: [36.69657190552609, -81.50626263852371],
      endingCoordinates: [36.812315966086125, -81.41792592300258],
      state: "Virginia",
    },
  },
  {
    "Day 53": {
      date: "5/23/2014",
      startingLocation: "Marion, VA (slept across the street)",
      endingLocation: "Marion, VA",
      startingCoordinates: [36.812315966086125, -81.41792592300258],
      endingCoordinates: [36.835, -81.5115],
      state: "Virginia",
    },
  },
  {
    "Day 54": {
      date: "5/24/2014",
      startingLocation: "Marion, VA",
      endingLocation: "VA 683, US 11, I-81",
      startingCoordinates: [36.835, -81.5115],
      endingCoordinates: [36.885610181716835, -81.37313797587635],
      state: "Virginia",
    },
  },
  {
    "Day 55": {
      date: "5/25/2014",
      startingLocation: "VA 683, US 11, I-81",
      endingLocation: "Crawfish Valley along Reed Creek",
      startingCoordinates: [36.885610181716835, -81.37313797587635],
      endingCoordinates: [36.95099054606718, -81.36395982764687],
      state: "Virginia",
    },
  },
  {
    "Day 56": {
      date: "5/26/2014",
      startingLocation: "Crawfish Valley along Reed Creek",
      endingLocation: "Chestnut Knob Shelter",
      startingCoordinates: [36.95099054606718, -81.36395982764687],
      endingCoordinates: [37.0577, -81.3993],
      state: "Virginia",
    },
  },
  {
    "Day 57": {
      date: "5/27/2014",
      startingLocation: "Chestnut Knob Shelter",
      endingLocation: "Laurel Creek",
      startingCoordinates: [37.0577, -81.3993],
      endingCoordinates: [37.10461928074985, -81.20093476139294],
      state: "Virginia",
    },
  },
  {
    "Day 58": {
      date: "5/28/2014",
      startingLocation: "Laurel Creek",
      endingLocation: "Jenny Knob Shelter",
      startingCoordinates: [37.10461928074985, -81.20093476139294],
      endingCoordinates: [37.155, -80.9801],
      state: "Virginia",
    },
  },
  {
    "Day 59": {
      date: "5/29/2014",
      startingLocation: "Jenny Knob Shelter",
      endingLocation: "Dismal Falls",
      startingCoordinates: [37.155, -80.9801],
      endingCoordinates: [37.1859, -80.9014],
      state: "Virginia",
    },
  },
  {
    "Day 60": {
      date: "5/30/2014",
      startingLocation: "Dismal Falls",
      endingLocation: "Sugar Run Gap",
      startingCoordinates: [37.1859, -80.9014],
      endingCoordinates: [37.256122228472535, -80.85551443184045],
      state: "Virginia",
    },
  },
  {
    "Day 61": {
      date: "5/31/2014",
      startingLocation: "Sugar Run Gap",
      endingLocation: "Pearisburg, VA",
      startingCoordinates: [37.256122228472535, -80.85551443184045],
      endingCoordinates: [37.3259, -80.734],
      state: "Virginia",
    },
  },
  {
    "Day 62": {
      date: "6/1/2014",
      startingLocation: "Pearisburg, VA",
      endingLocation: "Pearisburg, VA",
      startingCoordinates: [37.3259, -80.734],
      endingCoordinates: [37.3259, -80.734],
      state: "Virginia",
    },
  },
  {
    "Day 63": {
      date: "6/2/2014",
      startingLocation: "Pearisburg, VA",
      endingLocation: "Symms Gap",
      startingCoordinates: [37.3259, -80.734],
      endingCoordinates: [37.405448944487546, -80.6827025189022],
      state: "Virginia",
    },
  },
  {
    "Day 64": {
      date: "6/3/2014",
      startingLocation: "Symms Gap",
      endingLocation: "Bailey Gap Shelter",
      startingCoordinates: [37.405448944487546, -80.6827025189022],
      endingCoordinates: [37.401, -80.577],
      state: "Virginia",
    },
  },
  {
    "Day 65": {
      date: "6/4/2014",
      startingLocation: "Bailey Gap Shelter",
      endingLocation: "Sarver Hollow Shelter",
      startingCoordinates: [37.401, -80.577],
      endingCoordinates: [37.3547, -80.3374],
      state: "Virginia",
    },
  },
  {
    "Day 66": {
      date: "6/5/2014",
      startingLocation: "Sarver Hollow Shelter",
      endingLocation: "Pickle Branch Shelter",
      startingCoordinates: [37.3547, -80.3374],
      endingCoordinates: [37.3802, -80.1846],
      state: "Virginia",
    },
  },
  {
    "Day 67": {
      date: "6/6/2014",
      startingLocation: "Pickle Branch Shelter",
      endingLocation: "Johns Spring Shelter",
      startingCoordinates: [37.3802, -80.1846],
      endingCoordinates: [37.3854, -80.074],
      state: "Virginia",
    },
  },
  {
    "Day 68": {
      date: "6/7/2014",
      startingLocation: "Johns Spring Shelter",
      endingLocation: "Pig Farm Campsite",
      startingCoordinates: [37.3854, -80.074],
      endingCoordinates: [37.391, -80.0299],
      state: "Virginia",
    },
  },
  {
    "Day 69": {
      date: "6/8/2014",
      startingLocation: "Pig Farm Campsite",
      endingLocation: "Daleville, VA",
      startingCoordinates: [37.391, -80.0299],
      endingCoordinates: [37.391152246686815, -79.90647748263979],
      state: "Virginia",
    },
  },
  {
    "Day 70": {
      date: "6/9/2014",
      startingLocation: "Daleville, VA",
      endingLocation: "Daleville, VA",
      startingCoordinates: [37.391152246686815, -79.90647748263979],
      endingCoordinates: [37.391152246686815, -79.90647748263979],
      state: "Virginia",
    },
  },
  {
    "Day 71": {
      date: "6/10/2014",
      startingLocation: "Daleville, VA",
      endingLocation: "Random Spot between BRP 97 and BRP 95.9",
      startingCoordinates: [37.391152246686815, -79.90647748263979],
      endingCoordinates: [37.4364, -79.7405],
      state: "Virginia",
    },
  },
  {
    "Day 72": {
      date: "6/11/2014",
      startingLocation: "Random Spot between BRP 97 and BRP 95.9",
      endingLocation: "Jennings Creek",
      startingCoordinates: [37.4364, -79.7405],
      endingCoordinates: [37.529741373943054, -79.62195439096827],
      state: "Virginia",
    },
  },
  {
    "Day 73": {
      date: "6/12/2014",
      startingLocation: "Jennings Creek",
      endingLocation: "Harrison Ground Spring",
      startingCoordinates: [37.529741373943054, -79.62195439096827],
      endingCoordinates: [37.5578, -79.459],
      state: "Virginia",
    },
  },
  {
    "Day 74": {
      date: "6/13/2014",
      startingLocation: "Harrison Ground Spring",
      endingLocation: "Glasgow, VA",
      startingCoordinates: [37.5578, -79.459],
      endingCoordinates: [37.59668328103405, -79.39140786684067],
      state: "Virginia",
    },
  },
  {
    "Day 75": {
      date: "6/14/2014",
      startingLocation: "Glasgow, VA",
      endingLocation: "USFS 39",
      startingCoordinates: [37.59668328103405, -79.39140786684067],
      endingCoordinates: [37.67102191400382, -79.28352102884256],
      state: "Virginia",
    },
  },
  {
    "Day 76": {
      date: "6/15/2014",
      startingLocation: "USFS 39",
      endingLocation: "Seeley-Woodworth Shelter",
      startingCoordinates: [37.67102191400382, -79.28352102884256],
      endingCoordinates: [37.819011860110834, -79.15488094878918],
      state: "Virginia",
    },
  },
  {
    "Day 77": {
      date: "6/16/2014",
      startingLocation: "Seeley-Woodworth Shelter",
      endingLocation: "Harpers Creek Shelter",
      startingCoordinates: [37.819011860110834, -79.15488094878918],
      endingCoordinates: [37.8562, -79.0005],
      state: "Virginia",
    },
  },
  {
    "Day 78": {
      date: "6/17/2014",
      startingLocation: "Harpers Creek Shelter",
      endingLocation: "BRP Mile 9.6 - Dripping Rock Parking Area",
      startingCoordinates: [37.8562, -79.0005],
      endingCoordinates: [37.94124271200768, -78.93662037266445],
      state: "Virginia",
    },
  },
  {
    "Day 79": {
      date: "6/18/2014",
      startingLocation: "BRP Mile 9.6 - Dripping Rock Parking Area",
      endingLocation: "Rockfish Gap - Waynesboro, VA",
      startingCoordinates: [37.94124271200768, -78.93662037266445],
      endingCoordinates: [38.03112513190231, -78.85802206469982],
      state: "Virginia",
    },
  },
  {
    "Day 80": {
      date: "6/19/2014",
      startingLocation: "Rockfish Gap - Waynesboro, VA",
      endingLocation: "Waynesboro, VA",
      startingCoordinates: [38.03112513190231, -78.85802206469982],
      endingCoordinates: [38.03112513190231, -78.85802206469982],
      state: "Virginia",
    },
  },
  {
    "Day 81": {
      date: "6/20/2014",
      startingLocation: "Waynesboro, VA",
      endingLocation: "Turk Gap",
      startingCoordinates: [38.0682, -78.8894],
      endingCoordinates: [38.12926091836386, -78.78492752538071],
      state: "Virginia",
    },
  },
  {
    "Day 82": {
      date: "6/21/2014",
      startingLocation: "Turk Gap",
      endingLocation: "Loft Mountain Campground",
      startingCoordinates: [38.12926091836386, -78.78492752538071],
      endingCoordinates: [38.25347556516463, -78.66480779726169],
      state: "Virginia",
    },
  },
  {
    "Day 83": {
      date: "6/22/2014",
      startingLocation: "Loft Mountain Campground",
      endingLocation: "Hightop Hut",
      startingCoordinates: [38.25347556516463, -78.66480779726169],
      endingCoordinates: [38.33323803887636, -78.55836623492401],
      state: "Virginia",
    },
  },
  {
    "Day 84": {
      date: "6/23/2014",
      startingLocation: "Hightop Hut",
      endingLocation: "Bearfence Mountain Hut",
      startingCoordinates: [38.33323803887636, -78.55836623492401],
      endingCoordinates: [38.44419748121913, -78.47045590883663],
      state: "Virginia",
    },
  },
  {
    "Day 85": {
      date: "6/24/2014",
      startingLocation: "Bearfence Mountain Hut",
      endingLocation: "Stony Man Cliffs",
      startingCoordinates: [38.44419748121913, -78.47045590883663],
      endingCoordinates: [38.592, -78.375],
      state: "Virginia",
    },
  },
  {
    "Day 86": {
      date: "6/25/2014",
      startingLocation: "Stony Man Cliffs",
      endingLocation: "Thornton Gap - Luray, VA",
      startingCoordinates: [38.592, -78.375],
      endingCoordinates: [38.6561, -78.3186],
      state: "Virginia",
    },
  },
  {
    "Day 87": {
      date: "6/26/2014",
      startingLocation: "Thornton Gap - Luray, VA",
      endingLocation: "campsite just before Range View Cabin",
      startingCoordinates: [38.6561, -78.3186],
      endingCoordinates: [38.743702910583124, -78.29649614472517],
      state: "Virginia",
    },
  },
  {
    "Day 88": {
      date: "6/27/2014",
      startingLocation: "campsite just before Range View Cabin",
      endingLocation: "Front Royal, VA",
      startingCoordinates: [38.743702910583124, -78.29649614472517],
      endingCoordinates: [38.87831488218645, -78.15073205339598],
      state: "Virginia",
    },
  },
  {
    "Day 89": {
      date: "6/28/2014",
      startingLocation: "Front Royal, VA",
      endingLocation: "Front Royal, VA",
      startingCoordinates: [38.87831488218645, -78.15073205339598],
      endingCoordinates: [38.87831488218645, -78.15073205339598],
      state: "Virginia",
    },
  },
  {
    "Day 90": {
      date: "6/29/2014",
      startingLocation: "Front Royal, VA",
      endingLocation: "Mannasas Gap Shelter",
      startingCoordinates: [38.87831488218645, -78.15073205339598],
      endingCoordinates: [38.9307, -78.0327],
      state: "Virginia",
    },
  },
  {
    "Day 91": {
      date: "6/30/2014",
      startingLocation: "Mannasas Gap Shelter",
      endingLocation: "Bears Den Hostel",
      startingCoordinates: [38.9307, -78.0327],
      endingCoordinates: [39.1109, -77.8541],
      state: "Virginia",
    },
  },
  {
    "Day 92": {
      date: "7/1/2014",
      startingLocation: "Bears Den Hostel",
      endingLocation: "campsite three miles before Harpers Ferry",
      startingCoordinates: [39.1109, -77.8541],
      endingCoordinates: [39.2864, -77.7512],
      state: "Virginia",
    },
  },
  {
    "Day 93": {
      date: "7/2/2014",
      startingLocation: "campsite three miles before Harpers Ferry",
      endingLocation: "Harpers Ferry, WV",
      startingCoordinates: [39.2864, -77.7512],
      endingCoordinates: [39.3234, -77.7302],
      state: "Virginia, West Virginia",
    },
  },
  {
    "Day 94": {
      date: "7/3/2014",
      startingLocation: "Harpers Ferry, WV",
      endingLocation: "Crampton Gap Shelter",
      startingCoordinates: [39.3234, -77.7302],
      endingCoordinates: [39.4126, -77.637],
      state: "West Virginia, Maryland",
    },
  },
  {
    "Day 95": {
      date: "7/4/2014",
      startingLocation: "Crampton Gap Shelter",
      endingLocation: "The Free State Hostel - Wolfsville Rd",
      startingCoordinates: [39.4126, -77.637],
      endingCoordinates: [39.62996020425234, -77.55903664782717],
      state: "Maryland",
    },
  },
  {
    "Day 96": {
      date: "7/5/2014",
      startingLocation: "The Free State Hostel - Wolfsville Rd",
      endingLocation: "PA 16",
      startingCoordinates: [39.62996020425234, -77.55903664782717],
      endingCoordinates: [39.741537056001704, -77.49035635207751],
      state: "Maryland, Pennsylvania",
    },
  },
  {
    "Day 97": {
      date: "7/6/2014",
      startingLocation: "PA 16",
      endingLocation: "PA 16 (Hummelstown, PA)",
      startingCoordinates: [39.741537056001704, -77.49035635207751],
      endingCoordinates: [39.741537056001704, -77.49035635207751],
      state: "Pennsylvania",
    },
  },
  {
    "Day 98": {
      date: "7/7/2014",
      startingLocation: "PA 16 (Hummelstown, PA)",
      endingLocation: "Chimney Rocks",
      startingCoordinates: [39.741537056001704, -77.49035635207751],
      endingCoordinates: [39.8176, -77.4741],
      state: "Pennsylvania",
    },
  },
  {
    "Day 99": {
      date: "7/8/2014",
      startingLocation: "Chimney Rocks",
      endingLocation: "Birch Run Shelter",
      startingCoordinates: [39.8176, -77.4741],
      endingCoordinates: [39.9851, -77.4194],
      state: "Pennsylvania",
    },
  },
  {
    "Day 100": {
      date: "7/9/2014",
      startingLocation: "Birch Run Shelter",
      endingLocation: "James Fry (Tagg Run) Shelter",
      startingCoordinates: [39.9851, -77.4194],
      endingCoordinates: [40.066220270989, -77.20710738392226],
      state: "Pennsylvania",
    },
  },
  {
    "Day 101": {
      date: "7/10/2014",
      startingLocation: "James Fry (Tagg Run) Shelter",
      endingLocation: "Boiling Springs, PA",
      startingCoordinates: [40.066220270989, -77.20710738392226],
      endingCoordinates: [40.14910550474357, -77.12638651537524],
      state: "Pennsylvania",
    },
  },
  {
    "Day 102": {
      date: "7/11/2014",
      startingLocation: "Boiling Springs, PA",
      endingLocation: "Cove Mountain Shelter",
      startingCoordinates: [40.14910550474357, -77.12638651537524],
      endingCoordinates: [40.36381626904206, -77.06740248609653],
      state: "Pennsylvania",
    },
  },
  {
    "Day 103": {
      date: "7/12/2014",
      startingLocation: "Cove Mountain Shelter",
      endingLocation: "Duncannon, PA",
      startingCoordinates: [40.36381626904206, -77.06740248609653],
      endingCoordinates: [40.3981, -77.023],
      state: "Pennsylvania",
    },
  },
  {
    "Day 104": {
      date: "7/13/2014",
      startingLocation: "Duncannon, PA",
      endingLocation: "Duncannon, PA",
      startingCoordinates: [40.3981, -77.023],
      endingCoordinates: [40.3981, -77.023],
      state: "Pennsylvania",
    },
  },
  {
    "Day 105": {
      date: "7/14/2014",
      startingLocation: "Duncannon, PA",
      endingLocation: "Peters Mountain Shelter",
      startingCoordinates: [40.3981, -77.023],
      endingCoordinates: [40.4259, -76.8793],
      state: "Pennsylvania",
    },
  },
  {
    "Day 106": {
      date: "7/15/2014",
      startingLocation: "Peters Mountain Shelter",
      endingLocation: "Campsite just after PA 443",
      startingCoordinates: [40.4259, -76.8793],
      endingCoordinates: [40.48102121990069, -76.55028546492744],
      state: "Pennsylvania",
    },
  },
  {
    "Day 107": {
      date: "7/16/2014",
      startingLocation: "Campsite just after PA 443",
      endingLocation: "Campsite just after Shower Steps view",
      startingCoordinates: [40.48102121990069, -76.55028546492744],
      endingCoordinates: [40.5089, -76.3101],
      state: "Pennsylvania",
    },
  },
  {
    "Day 108": {
      date: "7/17/2014",
      startingLocation: "Campsite just after Shower Steps view",
      endingLocation: "Port Clinton, PA",
      startingCoordinates: [40.5089, -76.3101],
      endingCoordinates: [40.5838, -76.0264],
      state: "Pennsylvania",
    },
  },
  {
    "Day 109": {
      date: "7/18/2014",
      startingLocation: "Port Clinton, PA",
      endingLocation: "Port Clinton, PA",
      startingCoordinates: [40.5838, -76.0264],
      endingCoordinates: [40.5838, -76.0264],
      state: "Pennsylvania",
    },
  },
  {
    "Day 110": {
      date: "7/19/2014",
      startingLocation: "Port Clinton, PA",
      endingLocation: "Eckville Shelter",
      startingCoordinates: [40.5838, -76.0264],
      endingCoordinates: [40.63381310915545, -75.95787887239622],
      state: "Pennsylvania",
    },
  },
  {
    "Day 111": {
      date: "7/20/2014",
      startingLocation: "Eckville Shelter",
      endingLocation: "campground just before Lehigh Gap",
      startingCoordinates: [40.63381310915545, -75.95787887239622],
      endingCoordinates: [40.7809, -75.6128],
      state: "Pennsylvania",
    },
  },
  {
    "Day 112": {
      date: "7/21/2014",
      startingLocation: "campground just before Lehigh Gap",
      endingLocation: "Leroy A Smith Shelter",
      startingCoordinates: [40.7809, -75.6128],
      endingCoordinates: [40.83938650394143, -75.35941958128082],
      state: "Pennsylvania",
    },
  },
  {
    "Day 113": {
      date: "7/22/2014",
      startingLocation: "Leroy A Smith Shelter",
      endingLocation: "Delaware Water Gap",
      startingCoordinates: [40.83938650394143, -75.35941958128082],
      endingCoordinates: [40.9827, -75.1408],
      state: "Pennsylvania",
    },
  },
  {
    "Day 114": {
      date: "7/23/2014",
      startingLocation: "Delaware Water Gap",
      endingLocation: "Backpackers Campsite",
      startingCoordinates: [40.9827, -75.1408],
      endingCoordinates: [40.9996, -75.09],
      state: "Pennsylvania, New Jersey",
    },
  },
  {
    "Day 115": {
      date: "7/24/2014",
      startingLocation: "Backpackers Campsite",
      endingLocation: "Brink Road Shelter",
      startingCoordinates: [40.9996, -75.09],
      endingCoordinates: [41.1531, -74.8384],
      state: "New Jersey",
    },
  },
  {
    "Day 116": {
      date: "7/25/2014",
      startingLocation: "Brink Road Shelter",
      endingLocation: "High Point Shelter",
      startingCoordinates: [41.1531, -74.8384],
      endingCoordinates: [41.3158, -74.6573],
      state: "New Jersey",
    },
  },
  {
    "Day 117": {
      date: "7/26/2014",
      startingLocation: "High Point Shelter",
      endingLocation: "Pochuck Mountain Shelter",
      startingCoordinates: [41.3158, -74.6573],
      endingCoordinates: [41.2713, -74.5149],
      state: "New Jersey",
    },
  },
  {
    "Day 118": {
      date: "7/27/2014",
      startingLocation: "Pochuck Mountain Shelter",
      endingLocation: "Campsite just outside of Greenwood Lake NY",
      startingCoordinates: [41.2713, -74.5149],
      endingCoordinates: [41.2283, -74.3033],
      state: "New Jersey, New York",
    },
  },
  {
    "Day 119": {
      date: "7/28/2014",
      startingLocation: "Campsite just outside of Greenwood Lake NY",
      endingLocation: "Buchanon Mountain/East Mombasha Rd",
      startingCoordinates: [41.2283, -74.3033],
      endingCoordinates: [41.266173405322725, -74.19436345451476],
      state: "New York",
    },
  },
  {
    "Day 120": {
      date: "7/29/2014",
      startingLocation: "Buchanon Mountain/East Mombasha Rd",
      endingLocation: "Black Mountain",
      startingCoordinates: [41.266173405322725, -74.19436345451476],
      endingCoordinates: [41.2842064925071, -74.03950086022245],
      state: "New York",
    },
  },
  {
    "Day 121": {
      date: "7/30/2014",
      startingLocation: "Black Mountain",
      endingLocation: "US 6 - Peekskill NY",
      startingCoordinates: [41.2842064925071, -74.03950086022245],
      endingCoordinates: [41.32, -73.9795],
      state: "New York",
    },
  },
  {
    "Day 122": {
      date: "7/31/2014",
      startingLocation: "US 6 - Peekskill NY",
      endingLocation: "Dennytown Road/Sunk Mine Rd",
      startingCoordinates: [41.32, -73.9795],
      endingCoordinates: [41.420516473762014, -73.86917580373566],
      state: "New York",
    },
  },
  {
    "Day 123": {
      date: "8/1/2014",
      startingLocation: "Dennytown Road/Sunk Mine Rd",
      endingLocation: "NY 52 - Albany, NY",
      startingCoordinates: [41.420516473762014, -73.86917580373566],
      endingCoordinates: [41.5405, -73.7333],
      state: "New York",
    },
  },
  {
    "Day 124": {
      date: "8/2/2014",
      startingLocation: "NY 52 - Albany, NY",
      endingLocation: "NY 52 - Albany, NY",
      startingCoordinates: [41.5405, -73.7333],
      endingCoordinates: [41.5405, -73.7333],
      state: "New York",
    },
  },
  {
    "Day 125": {
      date: "8/3/2014",
      startingLocation: "NY 52 - Albany, NY",
      endingLocation: "Morgan Stewart Shelter",
      startingCoordinates: [41.5405, -73.7333],
      endingCoordinates: [41.56457342733767, -73.69176388699702],
      state: "New York",
    },
  },
  {
    "Day 126": {
      date: "8/4/2014",
      startingLocation: "Morgan Stewart Shelter",
      endingLocation: "Hurds Corner Road/Leather Hill Rd",
      startingCoordinates: [41.56457342733767, -73.69176388699702],
      endingCoordinates: [41.5941, -73.5833],
      state: "New York",
    },
  },
  {
    "Day 127": {
      date: "8/5/2014",
      startingLocation: "Hurds Corner Road/Leather Hill Rd",
      endingLocation: "Kent, CT",
      startingCoordinates: [41.5941, -73.5833],
      endingCoordinates: [41.7251, -73.4761],
      state: "New York, Connecticut",
    },
  },
  {
    "Day 128": {
      date: "8/6/2014",
      startingLocation: "Kent, CT",
      endingLocation: "St Johns Ledges",
      startingCoordinates: [41.7251, -73.4761],
      endingCoordinates: [41.7591221710805, -73.45230856604915],
      state: "Connecticut",
    },
  },
  {
    "Day 129": {
      date: "8/7/2014",
      startingLocation: "St Johns Ledges",
      endingLocation: "Sharon Mountain Campsite",
      startingCoordinates: [41.7591221710805, -73.45230856604915],
      endingCoordinates: [41.9174, -73.3806],
      state: "Connecticut",
    },
  },
  {
    "Day 130": {
      date: "8/8/2014",
      startingLocation: "Sharon Mountain Campsite",
      endingLocation: "Salisbury, CT",
      startingCoordinates: [41.9174, -73.3806],
      endingCoordinates: [41.9902, -73.4208],
      state: "Connecticut",
    },
  },
  {
    "Day 131": {
      date: "8/9/2014",
      startingLocation: "Salisbury, CT",
      endingLocation: "The Hemlocks Lean-to",
      startingCoordinates: [41.9902, -73.4208],
      endingCoordinates: [42.109846756977284, -73.42915365682056],
      state: "Connecticut, Massachusetts",
    },
  },
  {
    "Day 132": {
      date: "8/10/2014",
      startingLocation: "The Hemlocks Lean-to",
      endingLocation: "US 7 (Great Barrington, MA)",
      startingCoordinates: [42.109846756977284, -73.42915365682056],
      endingCoordinates: [42.154087778657775, -73.36466389879564],
      state: "Massachusetts",
    },
  },
  {
    "Day 133": {
      date: "8/11/2014",
      startingLocation: "US 7 (Great Barrington, MA)",
      endingLocation: "US 7 (Great Barrington, MA)",
      startingCoordinates: [42.154087778657775, -73.36466389879564],
      endingCoordinates: [42.154087778657775, -73.36466389879564],
      state: "Massachusetts",
    },
  },
  {
    "Day 134": {
      date: "8/12/2014",
      startingLocation: "US 7 (Great Barrington, MA)",
      endingLocation: "Shaker Campsite",
      startingCoordinates: [42.154087778657775, -73.36466389879564],
      endingCoordinates: [42.2519, -73.2247],
      state: "Massachusetts",
    },
  },
  {
    "Day 135": {
      date: "8/13/2014",
      startingLocation: "Shaker Campsite",
      endingLocation: "US 20 Lee, MA",
      startingCoordinates: [42.2519, -73.2247],
      endingCoordinates: [42.2916, -73.1574],
      state: "Massachusetts",
    },
  },
  {
    "Day 136": {
      date: "8/14/2014",
      startingLocation: "US 20 Lee, MA",
      endingLocation: "Upper Goose Pond Cabin",
      startingCoordinates: [42.290409540212615, -73.1554403014943],
      endingCoordinates: [42.2916, -73.1574],
      state: "Massachusetts",
    },
  },
  {
    "Day 137": {
      date: "8/15/2014",
      startingLocation: "Upper Goose Pond Cabin",
      endingLocation: "Dalton, MA",
      startingCoordinates: [42.2887, -73.1814],
      endingCoordinates: [42.4747, -73.1606],
      state: "Massachusetts",
    },
  },
  {
    "Day 138": {
      date: "8/16/2014",
      startingLocation: "Dalton, MA",
      endingLocation: "Powerlines just after Cheshire, MA",
      startingCoordinates: [42.4747, -73.1606],
      endingCoordinates: [42.5765, -73.1701],
      state: "Massachusetts",
    },
  },
  {
    "Day 139": {
      date: "8/17/2014",
      startingLocation: "Powerlines just after Cheshire, MA",
      endingLocation: "Wilbur Clearing Lean-to",
      startingCoordinates: [42.5765, -73.1701],
      endingCoordinates: [42.66787368122962, -73.17013861034697],
      state: "Massachusetts",
    },
  },
  {
    "Day 140": {
      date: "8/18/2014",
      startingLocation: "Wilbur Clearing Lean-to",
      endingLocation: "Seth Warner Shelter",
      startingCoordinates: [42.66787368122962, -73.17013861034697],
      endingCoordinates: [42.79816091180885, -73.11855319845006],
      state: "Massachusetts, Vermont",
    },
  },
  {
    "Day 141": {
      date: "8/19/2014",
      startingLocation: "Seth Warner Shelter",
      endingLocation: "Melville Nauheim Shelter",
      startingCoordinates: [42.79816091180885, -73.11855319845006],
      endingCoordinates: [42.8878, -73.0951],
      state: "Vermont",
    },
  },
  {
    "Day 142": {
      date: "8/20/2014",
      startingLocation: "Melville Nauheim Shelter",
      endingLocation: "Story Spring Shelter",
      startingCoordinates: [42.8878, -73.0951],
      endingCoordinates: [43.0504, -73.0124],
      state: "Vermont",
    },
  },
  {
    "Day 143": {
      date: "8/21/2014",
      startingLocation: "Story Spring Shelter",
      endingLocation: "William B Douglas Shelter Side Trail",
      startingCoordinates: [43.0504, -73.0124],
      endingCoordinates: [43.14452947038904, -72.99097428592101],
      state: "Vermont",
    },
  },
  {
    "Day 144": {
      date: "8/22/2014",
      startingLocation: "William B Douglas Shelter Side Trail",
      endingLocation: "Manchester Center, VT",
      startingCoordinates: [43.14452947038904, -72.99097428592101],
      endingCoordinates: [43.1895, -72.9899],
      state: "Vermont",
    },
  },
  {
    "Day 145": {
      date: "8/23/2014",
      startingLocation: "Manchester Center, VT",
      endingLocation: "campsite just before Peru Peak Shelter",
      startingCoordinates: [43.1895, -72.9899],
      endingCoordinates: [43.3012, -72.9524],
      state: "Vermont",
    },
  },
  {
    "Day 146": {
      date: "8/24/2014",
      startingLocation: "campsite just before Peru Peak Shelter",
      endingLocation: "Little Rock Pond Shelter",
      startingCoordinates: [43.3012, -72.9524],
      endingCoordinates: [43.3988, -72.9548],
      state: "Vermont",
    },
  },
  {
    "Day 147": {
      date: "8/25/2014",
      startingLocation: "Little Rock Pond Shelter",
      endingLocation: "Clarendon Shelter",
      startingCoordinates: [43.3988, -72.9548],
      endingCoordinates: [43.523726696736524, -72.91252711531678],
      state: "Vermont",
    },
  },
  {
    "Day 148": {
      date: "8/26/2014",
      startingLocation: "Clarendon Shelter",
      endingLocation: "Churchill Scott Shelter",
      startingCoordinates: [43.523726696736524, -72.91252711531678],
      endingCoordinates: [43.6449, -72.8534],
      state: "Vermont",
    },
  },
  {
    "Day 149": {
      date: "8/27/2014",
      startingLocation: "Churchill Scott Shelter",
      endingLocation: "Kent Pond",
      startingCoordinates: [43.6449, -72.8534],
      endingCoordinates: [43.6746, -72.8133],
      state: "Vermont",
    },
  },
  {
    "Day 150": {
      date: "8/28/2014",
      startingLocation: "Kent Pond",
      endingLocation: "Thistle Hill Shelter",
      startingCoordinates: [43.6746, -72.8133],
      endingCoordinates: [43.695, -72.4753],
      state: "Vermont",
    },
  },
  {
    "Day 151": {
      date: "8/29/2014",
      startingLocation: "Thistle Hill Shelter",
      endingLocation: "Hanover, NH",
      startingCoordinates: [43.695, -72.4753],
      endingCoordinates: [43.7025, -72.2895],
      state: "Vermont, New Hampshire",
    },
  },
  {
    "Day 152": {
      date: "8/30/2014",
      startingLocation: "Hanover, NH",
      endingLocation: "Hanover, NH",
      startingCoordinates: [43.7025, -72.2895],
      endingCoordinates: [43.7025, -72.2895],
      state: "New Hampshire",
    },
  },
  {
    "Day 153": {
      date: "8/31/2014",
      startingLocation: "Hanover, NH",
      endingLocation: "Velvet Rocks Shelter",
      startingCoordinates: [43.7025, -72.2895],
      endingCoordinates: [43.7023, -72.2646],
      state: "New Hampshire",
    },
  },
  {
    "Day 154": {
      date: "9/1/2014",
      startingLocation: "Velvet Rocks Shelter",
      endingLocation: "Hanover Center Road",
      startingCoordinates: [43.7023, -72.2646],
      endingCoordinates: [43.7048, -72.2119],
      state: "New Hampshire",
    },
  },
  {
    "Day 155": {
      date: "9/2/2014",
      startingLocation: "Hanover Center Road",
      endingLocation: "Hanover Center Road",
      startingCoordinates: [43.7048, -72.2119],
      endingCoordinates: [43.7048, -72.2119],
      state: "New Hampshire",
    },
  },
  {
    "Day 156": {
      date: "9/3/2014",
      startingLocation: "Hanover Center Road",
      endingLocation: "Campsite just after Hanover Center Road",
      startingCoordinates: [43.7048, -72.2119],
      endingCoordinates: [43.7079, -72.1995],
      state: "New Hampshire",
    },
  },
  {
    "Day 157": {
      date: "9/4/2014",
      startingLocation: "Campsite just after Hanover Center Road",
      endingLocation: "Smarts Mountain Shelter",
      startingCoordinates: [43.7079, -72.1995],
      endingCoordinates: [43.8254, -72.0374],
      state: "New Hampshire",
    },
  },
  {
    "Day 158": {
      date: "9/5/2014",
      startingLocation: "Smarts Mountain Shelter",
      endingLocation: "Hikers Welcome Hostel (Glencliff, NH)",
      startingCoordinates: [43.8254, -72.0374],
      endingCoordinates: [43.9899, -71.8991],
      state: "New Hampshire",
    },
  },
  {
    "Day 159": {
      date: "9/6/2014",
      startingLocation: "Hikers Welcome Hostel (Glencliff, NH)",
      endingLocation: "Hikers Welcome Hostel (Glencliff, NH)",
      startingCoordinates: [43.9899, -71.8991],
      endingCoordinates: [43.9899, -71.8991],
      state: "New Hampshire",
    },
  },
  {
    "Day 160": {
      date: "9/7/2014",
      startingLocation: "Hikers Welcome Hostel (Glencliff, NH)",
      endingLocation: "Eliza Brook Shelter",
      startingCoordinates: [43.9899, -71.8991],
      endingCoordinates: [44.1008, -71.7422],
      state: "New Hampshire",
    },
  },
  {
    "Day 161": {
      date: "9/8/2014",
      startingLocation: "Eliza Brook Shelter",
      endingLocation: "Campsite just before Little Haystack Mountain",
      startingCoordinates: [44.1008, -71.7422],
      endingCoordinates: [44.14043537145863, -71.64526919822988],
      state: "New Hampshire",
    },
  },
  {
    "Day 162": {
      date: "9/9/2014",
      startingLocation: "Campsite just before Little Haystack Mountain",
      endingLocation: "Zealand Falls Hut",
      startingCoordinates: [44.14043537145863, -71.64526919822988],
      endingCoordinates: [44.195, -71.4942],
      state: "New Hampshire",
    },
  },
  {
    "Day 163": {
      date: "9/10/2014",
      startingLocation: "Zealand Falls Hut",
      endingLocation: "Nauman Campsite",
      startingCoordinates: [44.195, -71.4942],
      endingCoordinates: [44.218731797321546, -71.37026487510494],
      state: "New Hampshire",
    },
  },
  {
    "Day 164": {
      date: "9/11/2014",
      startingLocation: "Nauman Campsite",
      endingLocation: "Lakes of the Clouds Hut",
      startingCoordinates: [44.218731797321546, -71.37026487510494],
      endingCoordinates: [44.2588, -71.319],
      state: "New Hampshire",
    },
  },
  {
    "Day 165": {
      date: "9/12/2014",
      startingLocation: "Lakes of the Clouds Hut",
      endingLocation: "Madison Springs Hut",
      startingCoordinates: [44.2588, -71.319],
      endingCoordinates: [44.3283, -71.2835],
      state: "New Hampshire",
    },
  },
  {
    "Day 166": {
      date: "9/13/2014",
      startingLocation: "Madison Springs Hut",
      endingLocation: "Pinkham Notch",
      startingCoordinates: [44.3283, -71.2835],
      endingCoordinates: [44.2568, -71.2529],
      state: "New Hampshire",
    },
  },
  {
    "Day 167": {
      date: "9/14/2014",
      startingLocation: "Pinkham Notch",
      endingLocation: "Zeta Pass",
      startingCoordinates: [44.2568, -71.2529],
      endingCoordinates: [44.28121653858644, -71.17314128707018],
      state: "New Hampshire",
    },
  },
  {
    "Day 168": {
      date: "9/15/2014",
      startingLocation: "Zeta Pass",
      endingLocation: "Gorham, NH",
      startingCoordinates: [44.28121653858644, -71.17314128707018],
      endingCoordinates: [44.4004, -71.1121],
      state: "New Hampshire",
    },
  },
  {
    "Day 169": {
      date: "9/16/2014",
      startingLocation: "Gorham, NH",
      endingLocation: "Gorham, NH",
      startingCoordinates: [44.4004, -71.1121],
      endingCoordinates: [44.4004, -71.1121],
      state: "New Hampshire",
    },
  },
  {
    "Day 170": {
      date: "9/17/2014",
      startingLocation: "Gorham, NH",
      endingLocation: "Gentian Pond Campsite",
      startingCoordinates: [44.4004, -71.1121],
      endingCoordinates: [44.4518, -71.0694],
      state: "New Hampshire, Maine",
    },
  },
  {
    "Day 171": {
      date: "9/18/2014",
      startingLocation: "Gentian Pond Campsite",
      endingLocation: "campsite just before Mahoosuc Notch",
      startingCoordinates: [44.4518, -71.0694],
      endingCoordinates: [44.5374, -70.9894],
      state: "Maine",
    },
  },
  {
    "Day 172": {
      date: "9/19/2014",
      startingLocation: "campsite just before Mahoosuc Notch",
      endingLocation: "Baldpate Lean-to",
      startingCoordinates: [44.5374, -70.9894],
      endingCoordinates: [44.5984, -70.9116],
      state: "Maine",
    },
  },
  {
    "Day 173": {
      date: "9/20/2014",
      startingLocation: "Baldpate Lean-to",
      endingLocation: "Hall Mountain Lean-to",
      startingCoordinates: [44.5984, -70.9116],
      endingCoordinates: [44.7009, -70.8246],
      state: "Maine",
    },
  },
  {
    "Day 174": {
      date: "9/21/2014",
      startingLocation: "Hall Mountain Lean-to",
      endingLocation: "S Arm Rd - Black Brook",
      startingCoordinates: [44.7009, -70.8246],
      endingCoordinates: [44.7209, -70.7861],
      state: "Maine",
    },
  },
  {
    "Day 175": {
      date: "9/22/2014",
      startingLocation: "S Arm Rd - Black Brook",
      endingLocation: "Bemis Stream",
      startingCoordinates: [44.7209, -70.7861],
      endingCoordinates: [44.8349, -70.7219],
      state: "Maine",
    },
  },
  {
    "Day 176": {
      date: "9/23/2014",
      startingLocation: "Bemis Stream",
      endingLocation: "Rangely, ME",
      startingCoordinates: [44.8349, -70.7219],
      endingCoordinates: [44.887, -70.5404],
      state: "Maine",
    },
  },
  {
    "Day 177": {
      date: "9/24/2014",
      startingLocation: "Rangely, ME",
      endingLocation: "Piazza Rock Lean-to",
      startingCoordinates: [44.887, -70.5404],
      endingCoordinates: [44.9041, -70.53],
      state: "Maine",
    },
  },
  {
    "Day 178": {
      date: "9/25/2014",
      startingLocation: "Piazza Rock Lean-to",
      endingLocation: "Spaulding Mountain Lean-to",
      startingCoordinates: [44.9041, -70.53],
      endingCoordinates: [44.9957, -70.3414],
      state: "Maine",
    },
  },
  {
    "Day 179": {
      date: "9/26/2014",
      startingLocation: "Spaulding Mountain Lean-to",
      endingLocation: "Stratton, ME",
      startingCoordinates: [44.9957, -70.3414],
      endingCoordinates: [45.1037, -70.3567],
      state: "Maine",
    },
  },
  {
    "Day 180": {
      date: "9/27/2014",
      startingLocation: "Stratton, ME",
      endingLocation: "Horns Pond Lean-tos",
      startingCoordinates: [45.1037, -70.3567],
      endingCoordinates: [45.1441, -70.3301],
      state: "Maine",
    },
  },
  {
    "Day 181": {
      date: "9/28/2014",
      startingLocation: "Horns Pond Lean-tos",
      endingLocation: "Flagstaff Lake",
      startingCoordinates: [45.1441, -70.3301],
      endingCoordinates: [45.1467, -70.1712],
      state: "Maine",
    },
  },
  {
    "Day 182": {
      date: "9/29/2014",
      startingLocation: "Flagstaff Lake",
      endingLocation: "Pierce Pond Lean-to",
      startingCoordinates: [45.1467, -70.1712],
      endingCoordinates: [45.24028170555148, -70.05547396560098],
      state: "Maine",
    },
  },
  {
    "Day 183": {
      date: "9/30/2014",
      startingLocation: "Pierce Pond Lean-to",
      endingLocation: "Bald Mountain Brook Lean-to",
      startingCoordinates: [45.24028170555148, -70.05547396560098],
      endingCoordinates: [45.258728456875296, -69.79943897293515],
      state: "Maine",
    },
  },
  {
    "Day 184": {
      date: "10/1/2014",
      startingLocation: "Bald Mountain Brook Lean-to",
      endingLocation: "Monson, ME",
      startingCoordinates: [45.258728456875296, -69.79943897293515],
      endingCoordinates: [45.3312, -69.5358],
      state: "Maine",
    },
  },
  {
    "Day 185": {
      date: "10/2/2014",
      startingLocation: "Monson, ME",
      endingLocation: "Leeman Brook Lean-to",
      startingCoordinates: [45.3312, -69.5358],
      endingCoordinates: [45.35157262511126, -69.49875159617412],
      state: "Maine",
    },
  },
  {
    "Day 186": {
      date: "10/3/2014",
      startingLocation: "Leeman Brook Lean-to",
      endingLocation: "Cloud Pond Lean-to",
      startingCoordinates: [45.35157262511126, -69.49875159617412],
      endingCoordinates: [45.4185, -69.3542],
      state: "Maine",
    },
  },
  {
    "Day 187": {
      date: "10/4/2014",
      startingLocation: "Cloud Pond Lean-to",
      endingLocation: "Carl A Newhall Lean-to",
      startingCoordinates: [45.4185, -69.3542],
      endingCoordinates: [45.531, -69.3151],
      state: "Maine",
    },
  },
  {
    "Day 188": {
      date: "10/5/2014",
      startingLocation: "Carl A Newhall Lean-to",
      endingLocation: "East Branch Lean-to",
      startingCoordinates: [45.531, -69.3151],
      endingCoordinates: [45.5967, -69.1982],
      state: "Maine",
    },
  },
  {
    "Day 189": {
      date: "10/6/2014",
      startingLocation: "East Branch Lean-to",
      endingLocation: "Antlers Campground",
      startingCoordinates: [45.5967, -69.1982],
      endingCoordinates: [45.67858499625466, -69.0046940305941],
      state: "Maine",
    },
  },
  {
    "Day 190": {
      date: "10/7/2014",
      startingLocation: "Antlers Campground",
      endingLocation: "Pollywog Stream",
      startingCoordinates: [45.67858499625466, -69.0046940305941],
      endingCoordinates: [45.77358881619277, -69.18449906433457],
      state: "Maine",
    },
  },
  {
    "Day 191": {
      date: "10/8/2014",
      startingLocation: "Pollywog Stream",
      endingLocation: "Abol Bridge Campground",
      startingCoordinates: [45.77358881619277, -69.18449906433457],
      endingCoordinates: [45.8346, -68.9648],
      state: "Maine",
    },
  },
  {
    "Day 192": {
      date: "10/9/2014",
      startingLocation: "Abol Bridge Campground",
      endingLocation: "Katahdin Stream Campground",
      startingCoordinates: [45.8346, -68.9648],
      endingCoordinates: [45.8871, -68.9988],
      state: "Maine",
    },
  },
  {
    "Day 193": {
      date: "10/10/2014",
      startingLocation: "Katahdin Stream Campground",
      endingLocation: "Mt. Katahdin",
      startingCoordinates: [45.8871, -68.9988],
      endingCoordinates: [45.9044, -68.9213],
      state: "Maine",
    },
  },
];

export default appalachianTrailDetails;
