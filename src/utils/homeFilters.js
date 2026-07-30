export const HOME_GENRE_OPTIONS = [
  { value: '', labelKey: 'All', shortLabelKey: 'filterAllShort' },
  { value: '動作', labelKey: 'Action' },
  { value: '喜劇', labelKey: 'Comedy' },
  { value: '劇情', labelKey: 'Drama' },
  { value: '恐怖', labelKey: 'Horror' },
  { value: '科幻', labelKey: 'Sci-Fi' },
  { value: '驚悚', labelKey: 'Thriller' },
  { value: '愛情', labelKey: 'Romance' },
  { value: '動畫', labelKey: 'Animation' },
  { value: '懸疑', labelKey: 'Mystery' },
];

export const HOME_MEDIA_OPTIONS = [
  { value: '', labelKey: 'mediaAll', shortLabelKey: 'filterAllShort' },
  { value: 'movie', labelKey: 'mediaMovie' },
  { value: 'tv', labelKey: 'mediaSeries' },
  { value: 'anime', labelKey: 'mediaAnime' },
];

export function selectedFilterLabel(options, value, translate, short = false) {
  const option = options.find((entry) => entry.value === value) || options[0];
  const key = short && option.shortLabelKey
    ? option.shortLabelKey
    : option.labelKey;
  return translate(key);
}
