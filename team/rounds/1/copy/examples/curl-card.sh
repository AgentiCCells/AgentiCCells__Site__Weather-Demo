curl -s https://data.promptugal.news/api/v1/ipma-warnings/card.json \
  | jq '{title, publisher, cadence: .schedule.cadence, terms: .terms.summary,
         terms_page: .terms.page, terms_read: .terms.read_at, since}'
