// Photos are from Wikimedia Commons under the licences shown; files live in /public/countries.
// Flags are from flagcdn.com, stored in /public/flags.

export interface CountryPhoto {
  src: string;
  place: string;
  author: string;
  license: string;
  source: string;
}

export interface CountryMedia {
  iso: string;
  flag: string;
  photos: CountryPhoto[];
}

export const COUNTRY_MEDIA: Record<string, CountryMedia> = {
  "uk": {
    "iso": "gb",
    "flag": "/flags/gb.svg",
    "photos": [
      {
        "src": "/countries/uk-1.jpg",
        "place": "Tower Bridge",
        "author": "Fuzzypiggy",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Tower_Bridge_at_Dawn.jpg"
      },
      {
        "src": "/countries/uk-2.jpg",
        "place": "Radcliffe Camera",
        "author": "Diliff",
        "license": "CC BY 2.5",
        "source": "https://commons.wikimedia.org/wiki/File:Radcliffe_Camera%2C_Oxford_-_Oct_2006.jpg"
      },
      {
        "src": "/countries/uk-3.jpg",
        "place": "Edinburgh Castle",
        "author": "Enric",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg"
      }
    ]
  },
  "germany": {
    "iso": "de",
    "flag": "/flags/de.svg",
    "photos": [
      {
        "src": "/countries/germany-1.jpg",
        "place": "Brandenburg Gate",
        "author": "Thomas Wolf, www.foto-tw.de",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Brandenburger_Tor_abends.jpg"
      },
      {
        "src": "/countries/germany-2.jpg",
        "place": "Heidelberg Castle",
        "author": "Motatcho",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Heidelberg-2726936.jpg"
      },
      {
        "src": "/countries/germany-3.jpg",
        "place": "Cologne Cathedral",
        "author": "Raimond Spekking",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:K%C3%B6lner_Dom_-_Westfassade_2022_ohne_Ger%C3%BCst-0968_b.jpg"
      }
    ]
  },
  "canada": {
    "iso": "ca",
    "flag": "/flags/ca.svg",
    "photos": [
      {
        "src": "/countries/canada-1.jpg",
        "place": "Parliament Hill",
        "author": "Wladyslaw",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Ottawa_-_ON_-_Stadtansicht.jpg"
      },
      {
        "src": "/countries/canada-2.jpg",
        "place": "Niagara Falls",
        "author": "Saffron Blaze",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:3Falls_Niagara.jpg"
      },
      {
        "src": "/countries/canada-3.jpg",
        "place": "Banff National Park",
        "author": "Gorgo",
        "license": "Public domain",
        "source": "https://commons.wikimedia.org/wiki/File:Moraine_Lake_17092005.jpg"
      }
    ]
  },
  "sweden": {
    "iso": "se",
    "flag": "/flags/se.svg",
    "photos": [
      {
        "src": "/countries/sweden-1.jpg",
        "place": "Gamla Stan",
        "author": "Arild Vågen",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Gamla_stan_September_2014_01.jpg"
      },
      {
        "src": "/countries/sweden-2.jpg",
        "place": "Stockholm City Hall",
        "author": "Julian Herzog (Website)",
        "license": "CC BY 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Stockholms_Stadshuset_City_Hall_Stockholm_2016_01.jpg"
      },
      {
        "src": "/countries/sweden-3.jpg",
        "place": "Uppsala Cathedral",
        "author": "Kateryna Baiduzha",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Uppsala_domkyrka%2C_flygbild.jpg"
      }
    ]
  },
  "netherlands": {
    "iso": "nl",
    "flag": "/flags/nl.svg",
    "photos": [
      {
        "src": "/countries/netherlands-1.jpg",
        "place": "Keukenhof",
        "author": "Urdulife",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:26Y_1599_2.jpg"
      },
      {
        "src": "/countries/netherlands-2.jpg",
        "place": "Rijksmuseum",
        "author": "Trougnouf (Benoit Brummer)",
        "license": "CC BY 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:South_facade_of_the_Rijksmuseum_Amsterdam_(DSCF0528).jpg"
      },
      {
        "src": "/countries/netherlands-3.jpg",
        "place": "Kinderdijk",
        "author": "Lucas Hirschegger",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:KinderdijkMolens02.jpg"
      }
    ]
  },
  "australia": {
    "iso": "au",
    "flag": "/flags/au.svg",
    "photos": [
      {
        "src": "/countries/australia-1.jpg",
        "place": "Sydney Opera House",
        "author": "Bernard Spragg. NZ from Christchurch, New Zealand",
        "license": "CC0",
        "source": "https://commons.wikimedia.org/wiki/File:Sydney_Australia._(21339175489).jpg"
      },
      {
        "src": "/countries/australia-2.jpg",
        "place": "The Twelve Apostles (Victoria)",
        "author": "Michael J Fromholtz",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:The_Twelve_Apostles_2011.jpg"
      },
      {
        "src": "/countries/australia-3.jpg",
        "place": "Uluru",
        "author": "Ek2030372672",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:ULURU.jpg"
      }
    ]
  },
  "usa": {
    "iso": "us",
    "flag": "/flags/us.svg",
    "photos": [
      {
        "src": "/countries/usa-1.jpg",
        "place": "Statue of Liberty",
        "author": "AskALotl",
        "license": "CC0",
        "source": "https://commons.wikimedia.org/wiki/File:Front_view_of_Statue_of_Liberty_(cropped).jpg"
      },
      {
        "src": "/countries/usa-2.jpg",
        "place": "Golden Gate Bridge",
        "author": "Frank Schulenburg",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_as_seen_from_Battery_East.jpg"
      },
      {
        "src": "/countries/usa-3.jpg",
        "place": "Grand Canyon",
        "author": "Lennart Sikkema",
        "license": "CC BY 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Canyon_River_Tree_(165872763).jpeg"
      }
    ]
  },
  "france": {
    "iso": "fr",
    "flag": "/flags/fr.svg",
    "photos": [
      {
        "src": "/countries/france-1.jpg",
        "place": "Arc de Triomphe",
        "author": "ZeusUpsistos",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Arc_de_Triomphe_-_Ao%C3%BBt_2026.jpg"
      },
      {
        "src": "/countries/france-2.jpg",
        "place": "Mont-Saint-Michel",
        "author": "Amaustan",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Mont-Saint-Michel_vu_du_ciel.jpg"
      },
      {
        "src": "/countries/france-3.jpg",
        "place": "Louvre",
        "author": "Benh LIEU SONG (Flickr)",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Louvre_Museum_Wikimedia_Commons.jpg"
      }
    ]
  },
  "japan": {
    "iso": "jp",
    "flag": "/flags/jp.svg",
    "photos": [
      {
        "src": "/countries/japan-1.jpg",
        "place": "Mount Fuji",
        "author": "Suicasmo",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg"
      },
      {
        "src": "/countries/japan-2.jpg",
        "place": "Fushimi Inari-taisha",
        "author": "Basile Morin",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg"
      },
      {
        "src": "/countries/japan-3.jpg",
        "place": "Shibuya Crossing",
        "author": "David Kernan",
        "license": "CC BY 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Shibuya_Crossing%2C_Aerial.jpg"
      }
    ]
  },
  "china": {
    "iso": "cn",
    "flag": "/flags/cn.svg",
    "photos": [
      {
        "src": "/countries/china-1.jpg",
        "place": "Great Wall of China",
        "author": "Severin.stalder",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:The_Great_Wall_of_China_at_Jinshanling-edit.jpg"
      },
      {
        "src": "/countries/china-2.jpg",
        "place": "Forbidden City",
        "author": "Pixelflake",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:The_Forbidden_City_-_View_from_Coal_Hill.jpg"
      },
      {
        "src": "/countries/china-3.jpg",
        "place": "The Bund",
        "author": "钉钉",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:The_Bund_2.jpg"
      }
    ]
  }
};

export function countryMedia(code: string): CountryMedia | null {
  return COUNTRY_MEDIA[code] ?? null;
}
