# Mirror of the live "Expense Form" settings (captured 26 Oct 2026) + mock masters from the live values seen.
E='59578287-e323-43e7-bbba-c553a37c8b79'; PH='cc950851-0bf3-4bdf-ab6e-61e86340cf37'; PV='3a191cfe-6e89-4a0f-98e8-5caf818771fb'; CO='5467e739-ea45-48ec-b860-49050b73e312'
BL='d601e2cd-5251-440f-a558-d4c91abbf767'; TC='aef53991-5e8b-4984-9e61-f24d1524f4d5'; GT='0aa5f2d6-6220-437e-b008-d28563b9cbcd'; PO='885b0bf8-0961-4172-893d-d66f3b68f292'
TB='cae5498c-c897-4c72-bafd-52f91f6b71c8'; AB='6550d942-1202-4908-a222-34a1b05c1a50'; TE='32d08658-2dcf-4d4f-bb2c-02e0ae8be511'; DS='bbce89bf-20b9-4bed-9f54-22b5fd5242c4'
RU='f6f34059-9a3c-46b7-97ca-c2f3dac1bbd2'; BN='7b09f966-85b1-46fe-a74f-6e68d59a136b'; ME='6c5178f6-9633-463b-8c5f-6655b45b6edb'; DT='e236f3c2-7728-4fc5-be09-4bb2d6b0e660'
CA='3bc85993-3573-41d7-8917-84ec293792b6'; EF='927b430b-e079-467f-a030-2531f6113f54'; GL='c168aa71-db5d-4ef8-b777-cfb97cb1d319'; CU='34ef99a5-1b1c-4a7b-96bf-74f618888d1f'
TO='188e3c73-dadc-44f8-8ed8-de361953b760'; HS='15065d16-6b44-49b9-9e61-4f187eb6135e'; TI='42af243c-7029-4744-9cd3-76a616261d8b'; GTOT='7b54ea52-4f1d-49d2-94fe-14af7c70e7a9'; PRE='1bc95d29-f9a0-43ab-9a8a-3943259f4530'
MU='bb32d502-2c68-48ba-800e-35298248e93f'; MP='6f89f9a3-7cbe-4aab-b255-691f90fea7f9'; MG='400b807a-d55a-40c7-a991-4a4a875dcaa3'
U_EMAIL='3e23d164-942c-438f-91dd-b924f76757ee'; U_PHONE='4ac9a0d4-17dd-4457-bd76-f746528b3909'; U_POS='43e54b1f-0788-4e5e-abdd-53db5aa3e252'; U_TYPE='fd9b64f3-db16-4abf-aaf1-897bc4fba3c1'; U_BUD='67990a42-e685-47e9-8ae4-2047d149c311'; U_PASS='aaaaaaaa-0000-0000-0000-000000000001'
P_EMAIL='a2becae7-4a35-48df-be4d-40005e4a2d95'; P_PAID='15eaf4f8-8396-4bc2-9aae-c5d1ab20560f'; P_CODE='f2a225ce-7ca5-41a7-9bd5-a914b554500d'
G_TYPE='862effb0-cb2e-4622-acb4-90c7dae592f3'; G_CAT='881a32dd-2089-494d-b136-63b04917a7ec'; G_FOR='ee717919-8206-49d1-af2a-9e904fec7c02'; G_NUM='34f75c16-2ffa-4ab7-964e-68df091e71b6'
LEFT='Option 1,Option 2,Option 3'
def f(id,label,type,general=None,specific=None,validation=None): return {'id':id,'label':label,'type':type,'settings':{'general':general or {'visibility':'NORMAL'},'specific':{'customOptions':LEFT,'optionsType':'CUSTOM',**(specific or {})},'validation':validation or {'fieldRule':'OPTIONAL'}}}
def c(id,name,type,specific=None,validation=None,lookup=None): return {'id':id,'name':name,'label':name,'type':type,'settings':{'general':{},'specific':specific or {},'validation':validation or {},'lookupSettings':lookup or {}}}
FORM={'panels':[{'fields':[
 f(E,'Email','SINGLE_SELECT',{'readOnly':True,'visibility':'READ_ONLY'},{'customOptions':'','optionsSource':'MASTER','optionsType':'MASTER','masterFormColumn':U_EMAIL,'masterFormId':MU,'defaultValueInSelectField':'USER_EMAIL'},{'fieldRule':'OPTIONAL','mandatorySettings':[{'controls':[PV],'value':'cc.approver@example.com'}]}),
 f(PH,'Phone Number','SHORT_TEXT',None,{'defaultValue':'MASTER','fillValueType':'MASTER','masterFormParentColumn':E,'masterFormColumn':U_PHONE,'masterFormId':MU}),
 f('771cfb6b-c07f-436f-a6f3-1050315f4df7','Divider','DIVIDER'),
 f(PV,'Paid Via','SINGLE_SELECT',None,{'customOptions':'','optionsSource':'MASTER','optionsType':'MASTER','masterFormColumn':P_PAID,'masterFormId':MP,'masterFormConditionColumn':[{'formField':E,'masterColumn':P_EMAIL,'formColumn':E}],'masterFormParentColumn':E,'showAllData':True,'parentFieldId':E,'defaultValueType':'NONE'}),
 f(CO,'Code','SHORT_TEXT',None,{'defaultValue':'MASTER','fillValueType':'MASTER','masterFormParentColumn':PV,'masterFormColumn':P_CODE,'masterFormId':MP}),
 f(BL,'Backlog','SINGLE_CHOICE',None,{'customDefaultValue':'Yes','customOptions':'Yes,NO'}),
 f(TC,'Type Code','SINGLE_SELECT',None,{'customOptions':'','optionsSource':'MASTER','optionsType':'MASTER','masterFormColumn':U_TYPE,'masterFormId':MU,'isSameMaster':True,'masterFormParentColumn':E}),
 f(GT,'GL-Type','SINGLE_SELECT',None,{'customOptions':'','optionsSource':'MASTER','optionsType':'MASTER','masterFormColumn':G_TYPE,'masterFormId':MG,'masterFormConditionColumn':[{'formField':TC,'masterColumn':G_TYPE,'formColumn':TC}]}),
 f(PO,'Position','SHORT_TEXT',None,{'defaultValue':'MASTER','fillValueType':'MASTER','masterFormColumn':U_POS,'masterFormId':MU,'masterFormParentColumn':E}),
 f(TB,'Expense Receipt','TABLE',None,{'tableColumns':[
   c(RU,'Receipt Upload','FILE_UPLOAD',{},{'allowedFileTypes':['pdf','jpg','jpeg','png'],'maxFileSize':10,'assignOtherControls':[BN,ME,DT,CA,EF,CU,HS,TI,TO],'fieldRule':'REQUIRED'}),
   c(BN,'Bill No','SHORT_TEXT',{},{'fieldRule':'REQUIRED'}), c(ME,'Merchant','SHORT_TEXT'), c(DT,'Date','DATE'),
   c(CA,'Category','SINGLE_SELECT',{'masterFormColumn':G_CAT,'masterFormId':MG,'isSameMaster':True},None,{'optionsSource':'MASTER','cascadeFromColumn':GT}),
   c(EF,'Expense For','SINGLE_SELECT',{'masterFormColumn':G_FOR,'masterFormId':MG,'isSameMaster':True},None,{'optionsSource':'MASTER','cascadeFromColumn':CA}),
   c(GL,'GL Number','SINGLE_SELECT',{'masterFormColumn':G_NUM,'masterFormId':MG},None,{'optionsSource':'MASTER','cascadeFromColumn':EF}),
   c('29fd9b68-1794-4adf-ad05-7accf7ae999f','Client Type','SINGLE_SELECT',{'customOptions':'Existing Client,Prospective Client'}),
   c(CU,'Currency Type','SINGLE_SELECT',{'customOptions':'CAD'}),
   c(TO,'Total','NUMBER',{'customDefaultValue':'0'}), c(HS,'HST','NUMBER',{'customDefaultValue':'0'}),
   c('700beab7-24e2-4d89-a45e-0c0f936c01c8','Tips Receipt','FILE_UPLOAD',{},{'allowedFileTypes':['pdf'],'maxFileSize':10,'assignOtherControls':[TI]}),
   c(TI,'Tips','NUMBER',{'customDefaultValue':'0'}),
   c(GTOT,'Grand Total','CALCULATED',{'formulaTokens':[{'type':'FIELD','value':TO},{'type':'OPERATOR','value':'+'},{'type':'FIELD','value':TI}]}),
   c(PRE,'Pre-Tax Amount','CALCULATED',{'formulaTokens':[{'type':'FIELD','value':TO},{'type':'OPERATOR','value':'-'},{'type':'FIELD','value':HS}]}),
   c('4c993c0f-ec9d-4abc-be21-62160eb2b493','Charge Back To matter','SINGLE_CHOICE',{'customOptions':'Yes,No'}),
 ]}),
 f(AB,'Available Budget','NUMBER',{'readOnly':True,'visibility':'HIDDEN'},{'defaultValue':'MASTER','fillValueType':'MASTER','masterFormParentColumn':E,'masterFormColumn':U_BUD,'masterFormId':MU}),
 f(TE,'Total Expense Amount','CALCULATED',{'readOnly':True,'visibility':'READ_ONLY'},{'formulaTokens':[{'type':'TABLE_SUM','value':TB+'::'+GTOT}]}),
 f(DS,'Description','LONG_TEXT'),
]}]}
MASTERS={
 MU:[{U_EMAIL:'partner.lawyer@example.com',U_PHONE:'55501001',U_POS:'Partner',U_TYPE:'PR',U_BUD:'10000',U_PASS:'secret-1','Password':'secret-1'},
     {U_EMAIL:'student.lawyer@example.com',U_PHONE:'55501002',U_POS:'Student',U_TYPE:'STUD',U_BUD:'2162.88',U_PASS:'secret-2','Password':'secret-2'}],
 MP:[{P_EMAIL:'partner.lawyer@example.com',P_PAID:'EFT',P_CODE:'PR'},{P_EMAIL:'student.lawyer@example.com',P_PAID:'CIBC Visa Card',P_CODE:'STUD'}],
 MG:[{G_TYPE:'STUD',G_CAT:'Donation',G_FOR:'Sponsorships',G_NUM:'52090'},{G_TYPE:'STUD',G_CAT:'Entertainment',G_FOR:'Associate Events',G_NUM:'52076'},{G_TYPE:'STUD',G_CAT:'Entertainment',G_FOR:'Staff Events',G_NUM:'53125'},
     {G_TYPE:'STUD',G_CAT:'Marketing',G_FOR:'Legal Conferences',G_NUM:'52080'},{G_TYPE:'PR',G_CAT:'Travel',G_FOR:'Flights',G_NUM:'60001'}],
}
