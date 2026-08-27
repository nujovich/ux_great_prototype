import type { RefListKey } from '../types/framing';

/**
 * Framing File reference data — PRD §4.2.
 *
 * Transcribed VERBATIM from the legacy wp5 POC
 * (/home/nujovich/poc_great/src/backend/demo_list.py:53,
 * `drop_down_values_framing_file_drop`). Do not invent, trim or reorder values.
 *
 * Three deliberate departures, each mandated by §4.2/§5.5:
 *  - `organType`/`energy` hold the ENGLISH values: the stored value is FR→EN
 *    translated at upload (§5.2), so the dropdown offers the translated image
 *    of the POC list, not its French source.
 *  - The POC's `Parent ranking` list (MBTP/CPU/'MBTP / PU') is NOT reproduced —
 *    §5.5 derives `parentRanking` from the selected parent line's ranking.
 *  - The POC's static `CPO`/`CPA` name lists are NOT reproduced — §4.2 requires
 *    Microsoft Graph API resolution of live CPO-role holders. The prototype has
 *    no Graph API, so the two lists below are a flagged substitution.
 *
 * `countryCluster` has 25 entries, not the 24 the task brief predicted: the
 * source list (demo_list.py:132-146) holds 5 "CE0xB" values plus 20 "CI0xB"/
 * "CI1xB"/"CI20B" values = 25, verified with `ast.literal_eval` against the
 * source dict. All 25 are transcribed verbatim below; none were trimmed.
 */
export const FRAMING_REFERENCE: Record<RefListKey, readonly string[]> = {
  whyThisRequest: [
    'Regulation', 'New business, new countries', 'Partner',
    'Electrification', 'New vh on existing market', 'Profitability',
    'CAF WW', 'Media risk', 'New vehicle plant',
  ],
  cpoDepartment: ['H-Project', 'H-R&AE', 'H-NP', 'H-TAS'],
  projectRanking: ['GM', 'M', 'B', 'C133W', 'C93W', 'C72W', 'C36W'],
  activityType: [
    'CPU', 'MBTP', 'MBPU', 'I4I', 'R&AE', 'New Business',
    'AFS - Service Development Project', 'AFS - Parts & Accessories',
    'AFS - Process, SW & Organization',
  ],
  requestType: ['Creation', 'Modification', 'Closure'],
  hboRboRfqCms: ['RFQ', 'RFQ answer Update', 'CMS', 'N/A'],
  currentEcoMilestone: ['ECO0 / MGMT / LEGISLATION', 'ECO1', 'ECO2', 'N/A'],
  expectedEcoOutput: ['ECO1', 'ECO2', 'ECO3', 'N/A'],
  vehicleRange: [
    'A-B', 'ALPINE', 'C', 'D-E', 'EDISON', 'EV', 'Global Access', 'HGR', 'LCV1', 'LCV2',
    'LCV3', 'LCV4', 'RSC', 'Avtovaz', 'NISSAN', '-', 'MOBILIZE', 'SANSOBJ',
  ],
  // English image of the POC "Part type" list (§5.2 FR→EN). Réducteur and
  // Pile à combustible have no PRD mapping — passed through untranslated.
  organType: [
    'Thermal Engine', 'Gearbox', 'Battery', 'Electric Engine',
    'Réducteur', 'Pile à combustible',
  ],
  allianceCode: [
    'BR10DEG1 LS', 'BR10DEG1 HS', 'HR10DDTG2', 'HR10DETG2', 'HR12DDTG1', 'HR13DDTG2', 'HR16DEG2',
    'HR16DEG3H', 'MR18DDTG4', 'QR25DEG3', 'K915SDTG1', 'K915SDVG8', 'M920DDVG2', 'M920DDVG3',
    'M920DDVG5', 'M923DDVG3', 'M923DDVG4', 'M923DDVG6', 'M923DDWG4', 'M923DDWG6', 'SX10M5Fg1',
    'SX10R5Fg1', 'SX10M5Fg2', 'JX16M5FG2', 'JX16M5FG3', 'JX20M5Fg1', 'JX20M5Fg2', 'JX20M5Fg3',
    'JX22M6FG1', 'TX26M6FG1', 'TX26M64G1', 'TX26M6FG2', 'TX26M64G2', 'TX26R6FG1', 'PX35M6FG1',
    'PX40R6FG2', 'DX15CVFG1', 'DX18CVFG2', 'FK25CVFG2', 'FK25CVFG3', 'DW30D7FG1', 'DW45D6FG1',
    'UK33CVFG1', 'HR12DDVG3', 'M922DDVG7', 'M922DDWG7', 'PX42M6FG4', 'UK28CVFG1', 'UK28CV4G1',
    'DW23D6FG1', 'HR18DDh', 'ZT50A9FG1', 'AR18DEG2', 'AR16DEG1', 'DB35A4F', 'DB45A4F', 'DB49A44',
    '5AQ', '5AL', '6AM', '6AK', '5DH', '4DB', 'BT1AE1', 'BT1AN1', 'BT1MN1', 'BT2MR1', 'BT3MN1',
    'BT4AR1', 'BT4MR1', 'BT6AE1', 'BT6BE1', 'BT7AR1', 'BT9AE1', 'BTAAG', 'BTAAR1', 'BTBAE1', 'BTDAN',
    'BTJAG', 'BTAAE1', 'BTFAE', 'BTGAE', 'EP15P5F', 'BT7FE', 'BTHAE', 'E2D14', 'E7A27', '4DG', '7DL',
    'EP15W5F', 'HX45M6RG1', 'E2D09', 'TX30M6FG1', 'RA0', 'RC0', 'RD0', 'BTKAE', 'BTDFN', '4DHT120',
    '0DHT',
  ],
  drivetrain: ['4X2', '4X4'],
  standardEmissions: [
    'I61C', 'I61A', 'CP06', 'CL03', 'CP6A', 'CP6B', 'CP6N', 'CP6M', 'CP7A', 'C01A', 'C02A', 'E01B',
    'E03A', 'E03B', 'E03D', 'E04A', 'E04C', 'E04G', 'E05A', 'E05C', 'E05D', 'E05E', 'E05H', 'E05N',
    'E05R', 'E06C', 'E06E', 'E06R', 'E06R/W', 'E06S', 'E06T', 'E06U', 'E06M', 'E07R', 'E06N', 'E06Q',
    'IFJ4', 'KL33', 'KL34', 'KL35', 'KL36', 'L62F', 'L72F', 'T07A', 'T2B5', 'E04B', 'E05F', 'E05S',
    'E06A', 'E06F', 'E06L', 'E06V', 'E07I', 'ELC1', 'I06A', 'I62C', 'I62R', 'KL03', 'KL32', 'L01A',
    'L02A', 'L60B', 'L62A', 'E06W', 'E07M', 'L83G', 'I62F', 'L83L', 'E06X', 'E06Y', 'I62E',
  ],
  // English image of the POC "Fuel" list (§5.2); E-series and N/A pass through.
  energy: [
    'Gasoline', 'E10', 'E100 (FLEX FL)', 'LPG', 'Diesel', 'Electric',
    'Hybrid - Gasoline', 'Hybrid - Diesel', 'E27', 'E26', 'E85', 'Hydrogen',
    'E20', 'N/A',
  ],
  technoGroup: ['', 'Diesel PWT', 'Gasoline PWT', 'PHEV PWT', 'HEV PWT', 'GM/M Transmission'],
  cmo: [
    'CMF-A', 'CMF-A+', "CMF-B H3'", 'CMF B H3"', 'CMF-B', 'CMF-B HS', 'CMO 2010', 'CMO 2012',
    'CMF C-D ph 1', 'CMF C-D ph 2', 'CMF C-D ph 3', 'CMF EV', 'CMF EV ext', 'XDD', 'RENAULT VP',
    'X67', 'X82', 'CMF-B LS', 'XFK',
  ],
  eeArchitecture: [
    'C1A', 'C1A HS', 'C1A HS EV', 'C1A LS', 'C1N', 'C1R', 'FACE/SDV', 'H1', 'T4',
    'SWEET110', 'SWEET120', 'SWEET400', 'SWEET420', 'SWEET423', 'SWEET500', 'T4VS', 'T4VS LS',
  ],
  countryCluster: [
    'CE01B - Europe Western & German Speaking', 'CE02B - Europe Balkans & DOM', 'CE03B - Europe RHD',
    'CE04B - Europe very cold climate', 'CE05B - Europe intermediate road quality',
    'CI01B - International Maghreb good roads', 'CI02B - International LATAM bad roads',
    'CI03B - International Uruguay', 'CI04B - International Chili', 'CI05B - International Mexico',
    'CI06B - International Brazil', 'CI07B - International Colombie', 'CI08B - Ecuador',
    'CI09B - International GCC (except Saudi Arabia) & TOM', 'CI10B - International Saudi Arabia',
    'CI11B - International Turkey & Israel High Spec ADAS', 'CI12B - International Korea',
    'CI13B - International North America', 'CI14B - International China',
    'CI15B - International LHD Africa bad roads temperate climate',
    'CI16B - International LHD bad roads very cold climate',
    'CI17B - International Japan RHD good roads temperate climate',
    'CI18B - International South Africa RHD good roads temperate climate',
    'CI19B - International Australia RHD good roads very hot climate',
    'CI20B - International India RHD bad roads very hot climate',
  ],
  // Prototype substitution for Graph API CPO-role resolution (§4.2).
  cpo: ['B. Hernandez', 'C. Canteli', 'D. Ceola', 'F. Istrate', 'I. Petcu'],
  cpa: ['K. Shway', 'G. Diaz', 'B. Popescu', 'M. Pruna', 'P. Zan'],
};
