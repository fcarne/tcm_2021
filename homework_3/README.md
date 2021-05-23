# Homework 3
All'interno della cartella si trovano:
* Gerry_Lambda.pdf: la presentazione per l'homework 3
* CreateDataLake.py: lo script per la creazione del DWH sul cluster MongoDB aggiornato
* Lambda (ognuna ha un handler, un file per le variabili d'ambiente, lo script per collegarsi a MongoDB e i Model di Mongoose):
  - Get_Watch_Next_By_Idx: dato un id, restituisce i watch_next del corrispondente talk
  - Generate_Quiz: genera l'id del quiz e invoca Generate_Quiz_Async
  - Generate_Quiz_Async: genera i quesiti del quiz collegandosi all'API di Quillionz
  - Get_Quiz_By_Id: dato un id, restituisce il quiz corrispondente 
