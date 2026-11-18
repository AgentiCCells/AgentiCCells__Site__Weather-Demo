curl -s https://data.promptugal.news/api/v1/ipma-observations/latest.json \
  | jq --argjson lat 37.0146 --argjson lon -7.9331 '
      .hour_utc as $h
      | [.stations[] | select(.reading != null)
         | . + {d: ((((.lat - $lat) * 111.2) | . * .)
                  + (((.lon - $lon) * 111.2 * ($lat * 0.017453 | cos)) | . * .) | sqrt)}]
      | min_by(.d)
      | {name, km: (.d * 10 | round / 10), hour_utc: $h, reading}'
