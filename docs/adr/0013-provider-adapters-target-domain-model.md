# Provider Adapters Target the Domain Model

Oracle provider adapters will normalize provider responses into the domain signal model before persistence or UI shaping. This keeps provider quirks out of database code and frontend response code, making ingestion easier to test and future providers easier to swap.

