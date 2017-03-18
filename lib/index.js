if(!String.prototype.compareNoCase){
	String.prototype.compareNoCase=function(str) { 
	  return this.toUpperCase()==str.toUpperCase();
	}
}
exports.Database=Database;
var dbType='mysql',dbConn,mysql,mysqlPool={},mysqlPools=[],sqlite,sqliteTransactions
,fs=require('fs'),jslib={},connection={},DatabaseOps={},TableOps={};
jslib={
	shows:function(str){
		console.log('...Start\r\n\r\n'+str+'\r\n\r\n....Stop');
	},
	showj:function(obj){
		console.log('...Start\r\n\r\n'+JSON.stringify(obj,null,"\t")+'\r\n\r\n....Stop');
	},
	createFailObject:function(response_id,response_message,other_object){
		var res={response_status:'FAIL',response_id:response_id
		,response_message:response_message};
		if(other_object!==undefined)this.mergeObjects(res,other_object);
		return res;
	},
	createOkObject:function(response_id,response_message,other_object){
		var res={response_status:'OK',response_id:response_id
		,response_message:response_message};
		if(other_object!==undefined)this.mergeObjects(res,other_object);
		return res;
	},
	mergeObjects:function(obj1,obj2){	
		for (var key in obj2) {
		if (obj2.hasOwnProperty(key)) obj1[key] = obj2[key];
		}
		return obj1;
	},
	jsonParse:function(jsonStr,defaultObj){
		try{
			return JSON.parse(jsonStr);
		}catch(e){
			return defaultObj || {};
		}
	},
	isNumeric:function(n){
		return !isNaN(parseFloat(n)) && isFinite(parseFloat(n));
	},
	isInteger:function(val){
		var validChars='0123456789',len=val.length;
		for(var i = 0; i < len; i++) {
			if(validChars.indexOf(val.charAt(i))==-1)
				return false;
		}
		return true;
	},
	isDouble:function(val){
		var validChars='0123456789.',len=val.length;
		for(var i = 0; i < len; i++) {
			if(validChars.indexOf(val.charAt(i))==-1)
				return false;
		}
		return true;
	},
	isAlphabetic:function(value){
		var filter = /^[a-zA-Z]+$/;
		return filter.test(value);
	},
	isValidDate:function(dateString){
		// First check for the pattern
		//if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))return false;
		if(!/^\d{4}\-\d{2}\-\d{2}$/.test(dateString))return false;
		// Parse the date parts to integers
		var parts = dateString.split("/");
		var day = parseInt(parts[1],10);
		var month = parseInt(parts[0],10);
		var year = parseInt(parts[2],10);
		// Check the ranges of month and year
		if(year < 1000 || year > 3000 || month == 0 || month > 12)return false;
		var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
		// Adjust for leap years
		if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;
		// Check the range of the day
		return day > 0 && day <= monthLength[month - 1];
	},
	isValidDateTime:function(dateString){
		// First check for the pattern
		//if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))return false;
		if(!/^\d{4}\-\d{2}\-\d{2}\ \d{2}:\d{2}:\{2}$/.test(dateString))return false;
		// Parse the date parts to integers
		var parts = dateString.split("/");
		var day = parseInt(parts[1],10);
		var month = parseInt(parts[0],10);
		var year = parseInt(parts[2],10);
		// Check the ranges of month and year
		if(year < 1000 || year > 3000 || month == 0 || month > 12)return false;
		var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
		// Adjust for leap years
		if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;
		// Check the range of the day
		return day > 0 && day <= monthLength[month - 1];
	},
	isAlphaNumeric:function(value){
		var filter =  /[^a-zA-Z0-9]/i;
		return !filter.test(value);
	},
	validateAlphanumeric:function(options){//console.log(options)
		var err={},message='';
		if(options.checkNull===undefined)options.checkNull=true;
		if(options.checkNull == true){
			if(options.fieldValue == "" || options.fieldValue===undefined){
				message= ''+options.fieldName+' cannot be null/empty';
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		if(options.fieldValue != ""){
			if(options.minLength > 0){
				if(options.minLength == options.maxLength){
					var len = options.fieldValue.length;			
					if(len < options.minLength || len > options.maxLength){
						message = options.fieldName+' must be '+options.minLength+' characters long';
						err = jslib.createFailObject(options.response_id||'',message,{error_code:'3'});
						return err;
					}
				}
			}
			if(options.minLength > 0){
				if(options.fieldValue.length < options.minLength ){		
					message = options.fieldName+ ' must be between '+options.minLength+' - '+options.maxLength+' characters long';			
					err = jslib.createFailObject(options.response_id||'',message,{error_code:'3'});
					return err;
				}
			}		
			if(options.maxLength > 0){
				if(options.fieldValue.length > options.maxLength ){
					message = options.fieldName+'  must be between '+options.minLength+' - '+options.maxLength+' characters long';
					err = jslib.createFailObject(options.response_id||'',message,{error_code:'3'});
					return err;
				}
			}		
			if(options.specialChars != ""){			
			}
		}
		return false;
	},
	validateAllowedValues:function(options){
		var err={},message='',allowedValues=options.allowedValues.split(','),fieldValue=options.fieldValue;
		if(allowedValues.indexOf(fieldValue)<0){
			message='unsupported value for '+options.fieldName;
			err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
			return err;
		}
		return false;
	},
	validateDouble:function(options){//console.log(query)
		var err={},message,checkNull=options.checkNull;
		if(checkNull === undefined || checkNull === null) checkNull = true;
		if(checkNull == true){
			if(options.fieldValue == ''){
				message = options.fieldName + " cannot be null";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		if(options.fieldValue != ''){
			if(!this.isDouble(options.fieldValue)){
				message = options.fieldName + " is not a valid number";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
				return err;
			}
			if(options.hasOwnProperty('minValue')||options.hasOwnProperty('maxValue')){
				var minValue,maxValue;
				if(options.hasOwnProperty('minValue'))minValue=options.minValue;
				if(options.hasOwnProperty('maxValue'))maxValue=options.minValue;
				if((options.fieldValue*1) < minValue){
					message = options.fieldName + " is must be more than "+minValue+"";
					err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
					return err;
				}
				if((options.fieldValue*1) > maxValue){
					message = options.fieldName + " is must be less than "+maxValue+"";
					err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
					return err;
				}
			}else{
				if(!options.hasOwnProperty('query')) return false;
				var query=options.query,len=query.length,val,c;
				for(var x=0; x < len ; x++){
					c = query[x]; val='';
					if( c == '>'){
						if(query[x+1] == '='){
							x++;
							for(x++; x < len; x++){
								c = query[x];
								if( c == ',' )break;
								val += c;
							}
							if(!(parseFloat(options.fieldValue) >= parseFloat(val))){
								message = ""+options.fieldName+" must be >= "+val+"";
								err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
								return err;
							}
						}else{
							for(x++; x < len; x++){
								c = query[x];
								if( c == ',' )break;
								val += c;
							}
							if(!(parseFloat(options.fieldValue) > parseFloat(val))){
								message = ""+options.fieldName+" must be > "+val+"";
								err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
								return err;
							}
						}				
					}else if( c == '<'){
						if(query[x+1] == '='){
							x++;
							for(x++; x < len; x++){
								c = query[x];
								if( c == ',' )break;
								val += c;
							}
							if(!(parseFloat(options.fieldValue) <= parseFloat(val))){
								message = ""+options.fieldName+" must be <= "+val+"";
								err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
								return err;
							}
						}else{
							for(x++; x < len; x++){
								c = query[x];
								if( c == ',' )break;
								val += c;
							}
							if(!(parseFloat(options.fieldValue) < parseFloat(val))){
								message = ""+options.fieldName+" must be < "+val+"";
								err = jslib.createFailObject(options.response_id||'',message,{error_code:'2'});
								return err;
							}
						}				
					}
				}
			}
		}
		return false;
	},
	validateInteger:function(options){//console.log(query)
		var err={},message='',checkNull=options.checkNull;
		if(checkNull === undefined || checkNull === null) checkNull = true;
		if(checkNull == true){
			if(options.fieldValue == ''){
				message = options.fieldName + " cannot be null";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		if(options.fieldValue != ''){
			if(!this.isInteger(options.fieldValue)){
				message = options.fieldName + " is not a number";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
			if(parseInt(options.fieldValue)<options.minValue){
				message = options.fieldName + " must be more than "+options.minValue+"";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
			if(parseInt(options.fieldValue)>options.maxValue){
				message = options.fieldName + " must be less than "+options.maxValue+"";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		return false;
	},
	validateDate:function(options){
		var err={},message='',checkNull=options.checkNull;
		if(checkNull === undefined || checkNull === null) checkNull = true;
		if(checkNull == true){
			if(options.fieldValue == ''){
				message = options.fieldName + " cannot be null";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		if(options.fieldValue != ''){
			if(!this.isValidDate(options.fieldValue)){
				message = options.fieldName + " is not a valid date";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		return false;
	},
	validateDateTime:function(options){
		var err={},message='',checkNull=options.checkNull;
		if(checkNull === undefined || checkNull === null) checkNull = true;
		if(checkNull == true){
			if(options.fieldValue == ''){
				message = options.fieldName + " cannot be null";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		if(options.fieldValue != ''){
			if(!this.isValidDateTime(options.fieldValue)){
				message = options.fieldName + " is not a valid date";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		return false;
	},
	validateEmail:function(options){
		var err={},message,checkNull=options.checkNull;
		if(checkNull === undefined || checkNull === null) checkNull = true;
		if(checkNull == true){
			if(options.fieldValue == ''){
				message = options.fieldName + " cannot be null";
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		if(options.fieldValue != ''){
			var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			if(!filter.test(options.fieldValue)){
				message= ''+options.fieldName+' is not a valid email address';
				err = jslib.createFailObject(options.response_id||'',message,{error_code:'1'});
				return err;
			}
		}
		return false;
	}
};
connection={
	open:false,
	Query:function(query,callback){
		DatabaseOps.GenQuery(query,callback);
	},
	Transaction:function(queries,callback){
		DatabaseOps.Transaction(queries,callback);
	},
	Release:function(){
		DatabaseOps.Release();		
	},
	Close:function(){
		DatabaseOps.Cose();	
	},
	Sql:{
		formInsert:function(tableName){
			return {type:'INSERT',tableName:tableName,fields:{}};	
		},
		formUpdate:function(tableName){
			return {type:'UPDATE',tableName:tableName,fields:{},clauses:{}};	
		},
		formDelete:function(tableName){
			return {type:'DELETE',tableName:tableName,clauses:{encoded:'',decoded:''}};
		},
		formDrop:function(tableName){
			return {type:'DROP',tableName:tableName};
		},
		formSqlLimit:function(options){
			var err={},limit='0,0',_limit=[],index=0,records=0,offset=0,newLimit='',type='N';
			if(options.hasOwnProperty('limit')){limit=options.limit;}
			if(options.hasOwnProperty('offset')){offset=options.offset;}
			if(options.hasOwnProperty('type')){type=options.type;}
			if(type=='N'){
				if(typeof options.limit== 'string'){
					_limit=limit.split(',');
					index=_limit[0];
					records=_limit[1];
					newLimit=''+(index*1+records*1-offset*1)+','+records+'';
				}
			}				
			return newLimit;
		}
	},
	ErrorCode:'DBERROR',
	Tables:[],
	queries:0
};
DatabaseOps={
	Connection:function(options,callback){
		var sendConnection=function(){
			callback(false,connection);return;
		};
		if(dbType=='mysql'){
			if(mysqlPools.length==1){mysqlPool=mysqlPools[0];}
			else{
				var pool_id=options.pool_id||'',filtered=[];
				filtered=mysqlPools.filter(function(d){return(d.pool_id==pool_id);});
				if(filtered<=0){_res=jslib.createFailObject('','No mysql pool(s) defined');callback(_res);return;}
				mysqlPool=filtered[0];
			}
			if(options.hasOwnProperty('database'))mysqlPool.config.connectionConfig.database=options.database;
			if(options.hasOwnProperty('user'))mysqlPool.config.connectionConfig.user=options.user;
			if(options.hasOwnProperty('password'))mysqlPool.config.connectionConfig.password=options.password;
			mysqlPool.getConnection(function(err,conn){
				if(err){
					var _res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n')),{error_code:err.code
					,error_number:err.errno});callback(_res);return;
				}else{
					connection.open=true;
					dbConn=conn;
					sendConnection();
				}
			});
		}else if(dbType=='sqlite'){
			var dbPath=options.dbPath||'';
			if(connection.open==true){sendConnection();return;}
			fs.readFile(dbPath,'binary',function(err,file){
				if(err){
					if(options.hasOwnProperty('autocreate')){
						if(options.autocreate){
							connection.open=true;
							//dbConn = new sqlite.Database(dbPath);//console.log(dbConn);
							dbConn = new sqliteTransactions(new sqlite.Database(dbPath));
							sendConnection();	
						}
					}else{
						var _res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
						,{error_code:err.code,error_number:err.errno});callback(_res);return;
					}
				}else{
					connection.open=true;
					//dbConn = new sqlite.Database(dbPath);//console.log(dbConn);
					dbConn = new sqliteTransactions(new sqlite.Database(dbPath));
					sendConnection();				
				}			
			});
		}
	},
	GenerateDB:function(options,callback){
		var createTables = function(callback){
			var len = connection.Tables.length,table,fields={},relations={},query='',x=0,y=0,queries=[];
			for(var x=0;x<len;x++){
				table = connection.Tables[x];//if(table.tableName!='user_log')continue;
				fields = table.fields;y=0;
				query = 'CREATE TABLE IF NOT EXISTS `'+table.tableName+'` (';
				for(var key in fields){
					if(y > 0) query += ' ,';
					query += ' `'+key+'`';
					type = fields[key].type;//console.log(type)
					if(type.compareNoCase('int')) query += ' INT( '+fields[key].maxLength+' )';
					else if(type.compareNoCase('varchar')) query += ' VARCHAR( '+fields[key].maxLength+' )';
					else if(type.compareNoCase('text')) query += ' TEXT';
					else if(type.compareNoCase('date')) query += ' DATE';
					else if(type.compareNoCase('datetime')) query += ' DATETIME';
					else if(type.compareNoCase('timestamp')) query += ' TIMESTAMP';
					else if(type.compareNoCase('bigint')) query += ' BIGINT( '+fields[key].maxLength+' )';
					else if(type.compareNoCase('double')) query += ' DOUBLE';
					///
					if(fields[key].isNull) query += " NULL";
					else query += " NOT NULL";
					if(fields[key].hasOwnProperty('defaultVal')){
						query += " DEFAULT '"+fields[key].defaultVal+"'";
					}
					y++;	
				}
				y=0;
				////
				relations = table.relations;
				var _table={},field={},_query='';
				for(var key in relations){
					if(relations[key].hasOwnProperty('from')) continue;
					if(!relations[key].hasOwnProperty('directKey'))continue;
					query += ' ,';
					query += ' `'+relations[key].directKey+'`';//console.log(relations[key].foreignKey)
					_table = connection.Tables.filter(function(d){return(d.tableName==key);})[0];//console.log(_table);
					field = _table.fields[relations[key].directKey];//console.log(field);
					type = field.type;
					if(type.compareNoCase('int')) query += ' INT( '+field.maxLength+' )';
					else if(type.compareNoCase('varchar')) query += ' VARCHAR( '+field.maxLength+' )';
					else if(type.compareNoCase('text')) query += ' TEXT';
					else if(type.compareNoCase('date')) query += ' DATE';
					else if(type.compareNoCase('datetime')) query += ' DATETIME';
					else if(type.compareNoCase('timestamp')) query += ' TIMESTAMP';
					else if(type.compareNoCase('bigint')) query += ' BIGINT( '+field.maxLength+' )';
					else if(type.compareNoCase('double')) query += ' DOUBLE';
					///
					if(field.isNull) query += " NULL";
					else query += " NOT NULL";
					if(field.hasOwnProperty('defaultVal')){
						query += " DEFAULT '"+field.defaultVal+"'";
					}
				}
				////
				if(table.primaryKey!='') query += ' ,PRIMARY KEY (`'+table.primaryKey+'`)';
				query += ')';
				if(dbType=='mysql') query += ' ENGINE=MyISAM DEFAULT CHARSET=latin1;';
				query += ';';
				queries.push(query);
			}		
			callback(false,queries.join(' '));return;
		};
		var appendPostQueries=function(query,callback){//callback(false,query);return;
			/*query += " INSERT INTO `user` (`user_id`,`username`,`password`,`account_name`,`account_type`";
			query += ",`account_status`,`use_api`,`api_key`,`api_secret`) VALUES ('UID-TGD-078','adminadmin','default1234'";
			query += ",'Admin Admin','A','A','Y','EObHF7mWp8Qyu8Qa3sHUUz77sc4eE3','BYRXIaKYbYL5FXIdFE3cSGTBFscY78');"
			callback(false,query);*/
			var len=options.postQueries.length;
			for(var x=0;x<len;x++){
				query+=' '+TableOps.createSqlQuery(options.postQueries[x])+';';
			}
			callback(false,query);
		};
		var executeQuery=function(options,query){
			
		};
		createTables(function(err,query){
			if(err){callback(err);return;}
			appendPostQueries(query,function(err,query){
				if(err){callback(err);return;}
				callback(false,query);
			});
		});
	},
	GenQuery:function(query,callback){
		var _res={};
		connection.queries+=1;
		if(dbType=='mysql'){
			dbConn.query(query,function(err,res){//console.log(rows)			
				if(err){console.log(err)	
					_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
					,{error_code:err.code,error_number:err.errno});callback(_res);return;
				}else{
					_res=jslib.createOkObject();
					callback(false,_res);return;
				}			
			});
		}else if(dbType=='sqlite'){
			dbConn.exec(query,function(err,res){//console.log(rows)			
				if(err){console.log(err)
					_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
					,{error_code:err.code,error_number:err.errno});callback(_res);return;
				}else{
					_res=jslib.createOkObject('','',res);
					callback(false,_res);return;
				}			
			});
		}
	},
	CustomQuery:function(query,callback){
		var _res={},queryStr;
		connection.queries+=1;
		if(dbType=='mysql'){
			queryStr=TableOps.createSqlQuery(query);if(query.log==true)jslib.shows(queryStr);
			dbConn.query(queryStr,function(err,res){//console.log(rows)			
				if(err){console.log(err);jslib.shows(queryStr);
					_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
					,{error_code:err.code,error_number:err.errno});callback(_res);return;
				}else{
					_res=jslib.createOkObject();
					callback(false,_res);return;
				}			
			});
		}else if(dbType=='sqlite'){
			queryStr=TableOps.createSqlQuery(query);if(query.log==true)jslib.shows(queryStr);
			dbConn.exec(queryStr,function(err,res){//console.log(rows)			
				if(err){console.log(err);jslib.shows(queryStr);
					_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
					,{error_code:err.code,error_number:err.errno});callback(_res);return;
				}else{
					_res=jslib.createOkObject('','',res);
					callback(false,_res);return;
				}			
			});
		}
	},
	CustomSelect:function(query,callback){
		var _res={},queryStr='';
		connection.queries+=1;
		if(dbType=='mysql'){
			queryStr=TableOps.createSqlQuery(query);if(query.log==true)jslib.shows(queryStr);
			dbConn.query(queryStr,function(err,rows){//console.log(rows)			
				if(err){
					_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
					,{error_code:err.code,error_number:err.errno});callback(_res);return;
				}else{
					callback(false,rows);return;
				}			
			});
		}else if(dbType=='sqlite'){
			queryStr=TableOps.createSqlQuery(query);if(query.log==true)jslib.shows(queryStr);
			dbConn.all(queryStr,function(err,rows){//console.log(rows)			
				if(err){
					_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
					,{error_code:err.code,error_number:err.errno});callback(_res);return;
				}else{
					callback(false,rows);return;
				}			
			});
		}
	},
	Transaction:function(queries,callback){
		var _res={},len=queries.length,query={},strQuery='';		
		if(dbType=='mysql'){
			dbConn.beginTransaction(function(err){
				/*if(err){_res=jslib.createFailObject('',err.stack.substr(0,err.stack.indexOf('\n')));callback(_res);return;}
				dbConn.query(strQuery,function(err,res){//jslib.showj(res);
					if(err){//console.log(err);
						dbConn.rollback(function(err2){
							if(err2){
								_res=jslib.createFailObject(connection.ErrorCode,err2.code,{error_code:err2.code
								,error_number:err2.errno});callback(_res);return;
							}else{
								_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
								,{error_code:err.code,error_number:err.errno});callback(_res);return;
							}
						});
					}else{
						dbConn.commit(function(err){
							if(err){
								_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
								,{error_code:err.code,error_number:err.errno});callback(_res);return;
							}else{
								_res=jslib.createOkObject('','');
								callback(false,_res);return;
							}
						});						
					}					
				});*/
				if(err)if(err){_res=jslib.createFailObject('',err.stack.substr(0,err.stack.indexOf('\n')));callback(_res);return;}
				var executeQuery=function(query){//jslib.Repo.showj(query);
					if(!query){
						dbConn.commit(function(err){
							if(err){
								_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
								,{error_code:err.code,error_number:err.errno});callback(_res);return;
							}else{
								_res=jslib.createOkObject('','');
								callback(false,_res);return;
							}
						});
					}else{
						var queryStr = TableOps.createSqlQuery(query);if(query.log==true)jslib.Repo.shows(queryStr);
						dbConn.query(queryStr,function(err,res){//jslib.Repo.showj(res);
							if(err){console.log(err);jslib.shows(queryStr);
								dbConn.rollback(function(err2){
									if(err2){
										_res=jslib.createFailObject(connection.ErrorCode,err2.code,{error_code:err2.code
										,error_number:err2.errno});callback(_res);return;
									}else{
										_res=jslib.createFailObject(connection.ErrorCode,err.stack.substr(0,err.stack.indexOf('\n'))
										,{error_code:err.code,error_number:err.errno});callback(_res);return;
									}
								});									
							}else{
								executeQuery(queries.shift());
							}						
						});
					}
				};
				executeQuery(queries.shift());
			});
		}else if(dbType == 'sqlite'){
			for(var x=0;x<len;x++){
				query=queries[x];
				strQuery+=""+TableOps.createSqlQuery(query)+"; ";
				connection.queries+=1;
			}
			dbConn.serialize(function(){
				dbConn.exec("BEGIN");
				dbConn.exec(strQuery,function(err,res){//jslib.showj(res);
					if(err){//console.log(err);
						dbConn.exec('ROLLBACK',function(err2){
							if(err2){
								_res=jslib.createFailObject(connection.ErrorCode,err2.code,{error_code:err2.code
								,error_number:err2.errno});callback(_res);return;
							}else{
								_res=jslib.createFailObject(connection.ErrorCode,err.code,{error_code:err.code
								,error_number:err.errno});callback(_res);return;
							}
						});									
					}else{
						dbConn.exec('COMMIT',function(err){
							if(err){
								_res=jslib.createFailObject(connection.ErrorCode,err.code,{error_code:err.code
								,error_number:err.errno});callback(_res);return;
							}else{
								_res=jslib.createOkObject('','');
								callback(false,_res);return;
							}
						});
					}						
				});
			});
		}
	},
	Release:function(){
		if(dbType=='mysql'){
			connection.queries=0;
			try{
				var index=mysqlPool._freeConnections.indexOf(dbConn);//console.log(index);
				if(index!==-1)console.log('double release');
				else dbConn.release();
			}catch(e){
				console.log(e);
			}
		}else if(dbType=='sqlite'){
			connection.queries=0;
		}
	},
	Close:function(){
		if(dbType=='mysql'){
			dbConn.close();
		}else if(dbType=='sqlite'){
			dbConn.close();
		}	
	}	
};
TableOps={
	verifyField:function(options){
		var err={},table=options.table||{},fields=table.fields||{},fieldName='',fieldValue='';
		fieldName = options.fieldName.split('.')[1];
		fieldValue = options.fieldValue;
		if(!fields.hasOwnProperty(fieldName)){
			err = jslib.createFailObject(''+table.tableId+'ED0','Sorry! table ['+table.tableName+'] has no field ['+fieldName+']');
			return err;
		}else{//if(table.tableName=='customer_payment'){console.log(err);};
			var desc=fields[fieldName],sType=desc.stype;
			if(sType.compareNoCase('alphaNum')){
				err = jslib.validateAlphanumeric({checkNull:options.checkNull,fieldName:fieldName,fieldValue:fieldValue
				,minLength:desc.minLength,maxLength:desc.maxLength,response_id:table.tableId+desc.errCode
				,specialChars:desc.specialChars});if(err){return err;}		
			}else if(sType.compareNoCase('int')){
				err = jslib.validateInteger({checkNull:options.checkNull,fieldName:fieldName,fieldValue:fieldValue
				,response_id:table.tableId+desc.errCode,minValue:options.minValue,maxValue:options.maxValue});
				if(err){return err;}
			}else if(sType.compareNoCase('double')){
				if(!options.hasOwnProperty('response_id'))options.response_id=table.tableId+desc.errCode||'';
				err = jslib.validateDouble(options);if(err){return err;}
			}else if(sType.compareNoCase('custom')){//custom values
				err = jslib.validateAllowedValues({checkNull:options.checkNull,fieldName:fieldName,fieldValue:fieldValue
				,response_id:table.tableId+desc.errCode,allowedValues:options.allowedValues||desc.allowedValues});
				if(err){return err;}
			}else if(sType.compareNoCase('email')){
				err = jslib.validateEmail({checkNull:options.checkNull,fieldName:fieldName,fieldValue:fieldValue
				,response_id:table.tableId+desc.errCode});
				if(err){return err;}
			}else if(sType.compareNoCase('date')){
				err = jslib.validateDate({checkNull:options.checkNull,fieldName:fieldName,fieldValue:fieldValue
				,response_id:table.tableId+desc.errCode});
				if(err){return err;}
			}else if(sType.compareNoCase('datetime')){
				err = jslib.validateDateTime({checkNull:options.checkNull,fieldName:fieldName,fieldValue:fieldValue
				,response_id:table.tableId+desc.errCode});
				if(err){return err;}
			}else{
				err=jslib.createFailObject('','Unknown data type for ['+fieldName+'] found in table ['+table.tableName+']');
				if(err){return err;}
			}
			return false;
		}
	},
	createSqlQuery:function(query){//console.log(query)
		var sql_query='';
		var createSelectQuery=function(query){
			var _query="SELECT "+query.fields.join(',')+" FROM `"+query.tableName+"`";
			if(query.joins.length>0){
				var x,joins=query.joins,len=joins.length,join;
				for(x = 0;x < len;x++){
					join = joins[x];
					//_query += "`"+join.tableName+"`";
					if(join.conditions != ''){
						_query += " "+join.conditions+"";
					}
				}
			}
			if(query.hasOwnProperty('clauses')){
				if(query.clauses.hasOwnProperty('decoded')){
					_query += ' '+query.clauses.decoded+'';
				}
			}
			if(query.hasOwnProperty('order')) _query += query.order;
			if(query.hasOwnProperty('limit')) _query += query.limit;
			return _query;	
		};
		var createInsertQuery=function(query){
			var _query='INSERT INTO `'+query.tableName+'` (',str='';
			for(var key in query.fields){
				if(str!='') str += ' , `'+key+'`';
				else str += ' `'+key+'`';
			}
			_query += str;
			_query += ' ) VALUES (';
			str = '';
			for(var key in query.fields){
				if(str!='') str += ' , \''+query.fields[key]+'\'';
				else str += ' \''+query.fields[key]+'\'';
			}
			_query += str;
			_query += ' )';
			return _query;	
		};
		var createUpdateQuery=function(query){
			var _query='UPDATE `'+query.tableName+'` SET ',str='',_str='';
			for(var key in query.fields){
				if(str!='') str += ' , `'+key+'` = \''+query.fields[key]+'\'';
				else str += ' `'+key+'` = \''+query.fields[key]+'\'';
			}
			_query += str;
			if(query.hasOwnProperty('clauses')){
				if(query.clauses.hasOwnProperty('decoded')){
					_query += ' '+query.clauses.decoded+'';
				}
			}
			return _query;	
		};
		var createDeleteQuery=function(query){
			var _query='DELETE FROM `'+query.tableName+'`';
			if(query.hasOwnProperty('clauses')){
				if(query.clauses.hasOwnProperty('decoded')){
					_query += ' '+query.clauses.decoded+'';
				}
			}
			return _query;		
		};
		if(query.type == 'SELECT'){
			sql_query = createSelectQuery(query);
		}else if(query.type == 'INSERT'){
			sql_query = createInsertQuery(query);
		}else if(query.type == 'UPDATE'){
			sql_query = createUpdateQuery(query);
		}else if(query.type == 'DELETE'){
			sql_query = createDeleteQuery(query);
		}
		return sql_query;
	},
	formatResults:function(table,rows,callback){//jslib.showj(rows);
		var _res={},rowLen=rows.length,item,fieldArr,tableName,fieldName,fieldValue,result={},list=[];
		if(rowLen==0){_res=jslib.createFailObject('','');callback(false,_res);return;}
		var formatValue=function(tableName,fieldName,fieldValue){
			var table=connection.Tables.filter(function(d){return(d.tableName==tableName);})[0],formatAs;
			formatAs=table.fields[fieldName].formatAs||'';
			if(formatAs=='object'){return jslib.jsonParse((fieldValue===null?'{}':fieldValue));}
			else if(formatAs=='array'){
				if(fieldValue===null||fieldValue=='') return [];
				else return fieldValue.split(',');
			}else{return (fieldValue===null?'':fieldValue);}		
		};
		for(var x=0;x < rowLen; x++){
			item = rows[x];
			for(var key in item){
				fieldArr=key.split('.');
				tableName=fieldArr[0];
				fieldName=fieldArr[1];
				fieldValue=formatValue(tableName,fieldName,item[key]);
				if(tableName!=table.tableName){
					if(!result.hasOwnProperty(tableName)){result[tableName]={};}
					result[tableName][fieldName]=fieldValue;
				}else{
					result[fieldName]=fieldValue;
				}
			}//jslib.showj(result);
			var manyAs,filtered=[],hasMany=false,fromTable='';
			for(var relation in table.relations){
				fromTable=table.relations[relation].from||'';
				if(result.hasOwnProperty(relation)){				
					if(fromTable!=''){
						if(!result.hasOwnProperty(fromTable))result[fromTable]={};
						result[fromTable][relation]=result[relation];
					}
				}
			}//jslib.showj(result);
			for(var relation in table.relations){
				fromTable=table.relations[relation].from||'';
				if(result.hasOwnProperty(relation)){				
					if(fromTable!=''){
						delete result[relation];
					}
				}
			}
			for(var relation in table.relations){
				manyAs=table.relations[relation].manyAs||'';
				if(result.hasOwnProperty(relation)){				
					if(manyAs!=''){hasMany=true;
						filtered=list.filter(function(d){return(d[table.primaryKey]==result[table.primaryKey]);});
						if(filtered.length>0){
							filtered[0][manyAs].push(result[relation]);
						}else{
							result[manyAs]=[];
							result[manyAs].push(result[relation]);
							delete result[relation];
						}					
					}
				}
			}//jslib.showj(result);return;
			if(hasMany){
				filtered=list.filter(function(d){return(d[table.primaryKey]==result[table.primaryKey]);});
				if(filtered.length==0){list.push(result);}
			}else{
				list.push(result);
			}
			result={};
		}//jslib.showj(list);
		var _res=jslib.createOkObject('','',{list:list});
		callback(false,_res);return;
	},
	formatResults2:function(table,rows,callback){jslib.showj(rows);
		var _res={},rowLen=rows.length,item,fieldArr,tableName,fieldName,fieldValue,result={},list=[],fromTable='',manyAs,filtered=[],hasMany=false;
		if(rowLen==0){_res=jslib.createFailObject('','');callback(false,_res);return;}
		var formatValue=function(tableName,fieldName,fieldValue){
			var table=connection.Tables.filter(function(d){return(d.tableName==tableName);})[0],formatAs;
			formatAs=table.fields[fieldName].formatAs||'';
			if(formatAs=='object'){return jslib.jsonParse((fieldValue===null?'{}':fieldValue));}
			else if(formatAs=='array'){
				if(fieldValue===null||fieldValue=='') return [];
				else return fieldValue.split(',');
			}else{return (fieldValue===null?'':fieldValue);}		
		};
		for(var x=0;x < rowLen; x++){
			item = rows[x];
			for(var key in item){
				fieldArr=key.split('.');
				tableName=fieldArr[0];
				fieldName=fieldArr[1];
				fieldValue=formatValue(tableName,fieldName,item[key]);
				if(tableName!=table.tableName){
					if(!result.hasOwnProperty(tableName)){result[tableName]={};}
					result[tableName][fieldName]=fieldValue;
				}else{
					result[fieldName]=fieldValue;
				}
			}//jslib.showj(result);//return;
			var getListItem=function(){
				filtered=list.filter(function(d){return(d[table.primaryKey]==result[table.primaryKey]);});
				if(filtered.length>0){return filtered[0];}
			};
			var dothis=function(){
				
			};
			var getListItems=function(tableName){
				fromTable=table.relations[tableName].from||'';
				manyAs=table.relations[tableName].manyAs||'';
				if(fromTable==''){
					if(manyAs!=''){
						filtered=list.filter(function(d){return(d[table.primaryKey]==result[table.primaryKey]);});
						if(filtered.length>0){
							return filtered[0][manyAs];
						}
					}
				}else{
					
				}
			};
			var insertRelation2=function(tableName){
				fromTable=table.relations[tableName].from||'';
				manyAs=table.relations[tableName].manyAs||'';				
				if(fromTable==''){
					if(manyAs!=''){
						filtered=list.filter(function(d){return(d[table.primaryKey]==result[table.primaryKey]);});
						if(filtered.length>0){jslib.showj(filtered[0]);
							var _table=connection.Tables.filter(function(d){return(d.tableName==tableName);})[0];
							filtered=filtered[0][manyAs].filter(function(d){return(d[_table.primaryKey]==result[tableName][_table.primaryKey]);});
							if(filtered.length>0){jslib.showj(filtered);
							}
						}else{
							if(!result[tableName].hasOwnProperty(manyAs)){
								result[manyAs]=[];
								result[manyAs].push(result[tableName]);
							}
						}
					}
				}else{
					_manyAs=table.relations[fromTable].manyAs||'';
					if(_manyAs!=''){
						if(!result.hasOwnProperty(_manyAs)){//
							
						}else{
							var _table=connection.Tables.filter(function(d){return(d.tableName==fromTable);})[0];
							filtered=result[_manyAs].filter(function(d){return(d[_table.primaryKey]==result[fromTable][_table.primaryKey]);});
							if(!filtered[0].hasOwnProperty(manyAs))filtered[0][manyAs]=[];
							filtered[0][manyAs].push(result[tableName]);							
						}
					}
				}
			};
			var insertRelation=function(tableName){
				fromTable=table.relations[tableName].from||'';
				manyAs=table.relations[tableName].manyAs||'';
				if(fromTable==''){
					if(manyAs!=''){
						if(!result[tableName].hasOwnProperty(manyAs)){
							result[manyAs]=[];
							result[manyAs].push(result[tableName]);
						}
					}
				}else{
					_manyAs=table.relations[fromTable].manyAs||'';
					if(_manyAs!=''){
						if(!result.hasOwnProperty(_manyAs)){//
							
						}else{
							var _table=connection.Tables.filter(function(d){return(d.tableName==fromTable);})[0];
							filtered=result[_manyAs].filter(function(d){return(d[_table.primaryKey]==result[fromTable][_table.primaryKey]);});
							if(!filtered[0].hasOwnProperty(manyAs))filtered[0][manyAs]=[];
							filtered[0][manyAs].push(result[tableName]);							
						}
					}
				}
			};
			for(var relation in table.relations){
				if(result.hasOwnProperty(relation)){
					insertRelation2(relation);					
				}
			}//jslib.showj(result);return;
			for(var relation in table.relations){
				fromTable=table.relations[relation].from||'';
				manyAs=table.relations[relation].manyAs||'';
				if(result.hasOwnProperty(relation)){				
					if(fromTable!=''){
						delete result[relation];
					}
					if(manyAs!=''){hasMany=true;
						delete result[relation];
					}
				}
			}//jslib.showj(result);return;
			if(hasMany){
				filtered=list.filter(function(d){return(d[table.primaryKey]==result[table.primaryKey]);});
				if(filtered.length==0){list.push(result);}
			}else{
				list.push(result);
			}//jslib.showj(result);return;
			result={};
		}jslib.showj(list);
		var _res=jslib.createOkObject('','',{list:list});
		//callback(false,_res);return;
	},
	Select:function(options,callback){//console.log(options);
		var getAllFields=function(query,table){
			var tableFields=table.fields||{};
			for(var key in tableFields){
				query.fields.push(""+table.tableName+"."+key+" AS '"+table.tableName+"."+key+"'");
			}
			if(table.hasOwnProperty('relations')){
				var relations=table.relations,obj={},_from;
				for(var key in relations){
					obj = relations[key];
					if(!obj.hasOwnProperty('directKey'))continue;
					if(obj.hasOwnProperty('from'))continue;
					query.fields.push(""+table.tableName+"."+obj['directKey']+" AS '"+key+"."+obj['directKey']+"'");
				}
			}
		};
		var formJoin=function(query,tableName){//console.log(query)
			var attemptJoin=function(tableName){
				var err={},table={},filtered=connection.Tables.filter(function(d){return(d.tableName==query.tableName);});
				if(filtered.length<=0){
					err=jslib.createFailObject(connection.ErrorCode,'Database table ['+query.tableName+'] is not defined');
					return err;
				}
				table=filtered[0];//console.log(table);
				if(!table.hasOwnProperty('relations')){
					err=jslib.createFailObject(connection.ErrorCode,'Sorry, table '+table.tableName+' has no relations');
					return err;
				}
				if(!table.relations.hasOwnProperty(tableName)){
					err=jslib.createFailObject(connection.ErrorCode,'Sorry, table '+table.tableName+' has no relation with table '+tableName+'');
					return err;
				}
				var fromTable=table.relations[tableName].from||'';
				if(fromTable==''){
					joinTable(table,tableName);
				}else{					
					var newJoin;fromTable=tableName;
					while(1){
						newJoin=joinTable(table,fromTable);
						if(newJoin=='OK'){
							if(!hasJoin(query,tableName)){
								fromTable=tableName;
							}else{
								break;
							}
						}else{
							fromTable=newJoin;
						}					
					}
				}
				return false;
			};			
			var joinTable=function(table,tableName){//console.log(table)
				var joinTable2=function(table,mainTable,newTable){
					var join={type:options.type||'',tableName:newTable||'',conditions:''};
					if(table.relations[newTable].many){join.type='JOIN';}
					else {join.type='LEFT JOIN';}
					if(table.relations[newTable].hasOwnProperty('query')){
						join.conditions=table.relations[newTable]['query'];
					}else{
						if(table.relations[newTable].hasOwnProperty('directKey')){
							join.conditions=''+join.type+' `'+newTable+'` ON '+mainTable+'.'+table.relations[newTable].directKey+' = '+newTable+'.'+table.relations[newTable].directKey+'';
						}else{
							if(table.relations[newTable].hasOwnProperty('indirectKey')){
								join.conditions=''+join.type+' `'+newTable+'` ON '+mainTable+'.'+table.relations[newTable].indirectKey+' = '+newTable+'.'+table.relations[newTable].indirectKey+'';
							}
						}
					}
					query.joins.push(join);
				};
				if(!hasJoin(query,tableName)){
					var fromTable=table.relations[tableName].from||'';
					if(fromTable!=''){
						if(!hasJoin(query,fromTable)){
							return fromTable;
						}else{
							joinTable2(table,fromTable,tableName);
							return 'OK';
						}
					}else{
						joinTable2(table,table.tableName,tableName);
						return 'OK';
					}
				}else{
					return 'OK';
				}
			};
			var hasJoin=function(query,tableName){
				var filtered = query.joins.filter(function(d){return(d.tableName==tableName);});
				if(filtered.length<=0){return false}
				else return true;
			};
			if(!hasJoin(query,tableName)){
				err=attemptJoin(tableName);if(err){return err;}
				return false;				
			}else{
				return false;
			}
		}
		var formClauses=function(query){
			if(!query.hasOwnProperty('clauses')){return false;}
			if(!query.clauses.hasOwnProperty('encoded')){return false;}
			var res={},err={},clauses=query.clauses.encoded||'',queryStr='',queryStr_='',len=clauses.length,x,n
			,field='',table={},fields={},tableName,fieldName,fieldValue='',filtered=[];
			if(clauses==''){return false;}
			queryStr += " WHERE ";
			for(x=0;x<len;x++){
				n = clauses[x];
				if(n == '(' || n == ')') queryStr += " "+n+" ";  
				else if(n == ';') queryStr += " AND ";
				else if(n == '|') queryStr += " OR ";
				else if(n == '=' || n == '!' || n == '~' || n == '<' || n == '>' || n == ':'){
					tableName = field.split('.')[0]||'';
					filtered=connection.Tables.filter(function(d){return(d.tableName==tableName);});
					if(filtered.length<=0){
						res=jslib.createFailObject(connection.ErrorCode,'Table '+tableName+' is not defined');				
						return res;
					}
					table=filtered[0];
					if(tableName!=query.tableName){
						err=formJoin(query,tableName);
						if(err){return err;}	
					}
					fieldName = field.split('.')[1]||'';
					fields = table.fields || {};
					if(!fields.hasOwnProperty(fieldName)){
						res=jslib.createFailObject(connection.ErrorCode,'Invalid clause on field name ['+fieldName+'] found in table ['+tableName+']');
						return res;
					}
					queryStr += ' '+field+'';
					if(n == '='){
						queryStr += " = ";
					}else if(n == '!'){
						queryStr += " <> ";
					}else if(n == '~'){
						queryStr += " LIKE ";
					}else if(n == '<'){
						if(clauses[x+1] == '='){queryStr += " <= ";x++;}
						else queryStr += " < ";
					}else if(n == '>'){
						if(clauses[x+1] == '='){queryStr += " >= ";x++;}
						else queryStr += " > ";				
					}
					for(x++; x < len; x++){
						n = clauses[x];//console.log(n)
						if(n == ';' || n == '|' || n == '(' || n == ')' || n == '\''){
							if(n == ';') queryStr_ += " AND ";
							else if(n == '|') queryStr_ += " OR ";
							else if(n == '(') queryStr_ += " ( ";
							else if(n == ')') queryStr_ += " ) ";
							else if(n == '\'') continue;							
							break;
						}else
							fieldValue += n;
					}
					queryStr+=" '"+fieldValue+"' "+queryStr_+"";
					field = '';
					fieldValue = '';
					queryStr_ = '';
				}else{
					field += n;
				}
			}
			query.clauses.decoded = queryStr;
			return false;
		};
		var formOrdering=function(query){//console.log(query);
			var err={},orderStr=query.order||'',order='',_order='',type='',orderQuery='',fullField=''
			,tableName='',fieldName='';
			if(orderStr!=''){
				var array=orderStr.split(','),len=array.length;
				if(len > 0){
					orderQuery += ' ORDER BY';
					for(var x=0; x<len; x++){
						if(x>0) orderQuery += ',';
						order = array[x];
						_order = order.split('/');
						fullField = _order[0];
						type = _order[1];
						tableName = fullField.split('.')[0];
						fieldName = fullField.split('.')[1];
						if(query.tableName!=tableName){
							err = formJoin(query,tableName);
							if(err){return err;}
						}
						orderQuery += ' '+fullField+' '+type+'';
					}
					query.order=orderQuery;
				}
			}	
			return false;
		};
		var formLimit=function(query){
			var err={},limitStr=query.limit||'',limitQuery='';
			if(limitStr!=''){
				/*var array=limitStr.split(','),len=array.length;
				if(len == 1){
					limitQuery = ' LIMIT';
					if(!jslib.validateInteger({checkNull:true,fieldName:'order clause',fieldValue:limitStr
					,response_id:''},err)){
						callback(err);return;
					}
					limitQuery = ' '+limitStr+'';
				}else if(len == 2){
					limitQuery = ' LIMIT';
					if(!jslib.validateInteger({checkNull:true,fieldName:'order clause',fieldValue:limitStr
					,response_id:''},err)){
						callback(err);return;
					}
					limitQuery = ' '+limitStr+'';
				}else{
					err = jslib.createFailObject(dbConn.dbErrorCode,'Error with order limit query');
					callback(err);return;
				}*/
				query.limit=' LIMIT '+limitStr;
			}
			return false;
		};
		var res={},err={},fields=options.fields||'',fieldsArray=fields.split(','),fullField='',field=[],query={}	
		,len=fieldsArray.length,table_name='',field_name='',table={},tableFields={},filtered=[];//console.log(query)
		query={type:'SELECT',tableName:options.table.tableName,fields:[],joins:[],log:options.log||false}
		if(options.hasOwnProperty('clauses')){query.clauses=options.clauses;}
		if(options.hasOwnProperty('order')){query.order=options.order;}
		if(options.hasOwnProperty('limit')){query.limit=options.limit;}//console.log(fieldsArray)
		for(var x=0; x<len; x++){
			fullField = fieldsArray[x] || '';
			field = fullField.split('.');		
			if(field.length!=2){
				res=jslib.createFailObject(connection.ErrorCode,'Invalid field name ['+field+']');
				callback(res);return;
			}
			table_name = field[0];
			field_name = field[1];
			filtered=connection.Tables.filter(function(d){return(d.tableName==table_name);});
			if(filtered.length<=0){
				res=jslib.createFailObject(connection.ErrorCode,'Database table ['+table_name+'] is not defined');
				callback(res);return;
			}
			table=filtered[0];
			tableFields = table.fields||{};
			if(field_name=='*'){
				getAllFields(query,table);
			}else{
				if(tableFields.hasOwnProperty(field_name)){
					query.fields.push(""+table.tableName+"."+field_name+" AS '"+table.tableName+"."+field_name+"'");
				}else{
					res=jslib.createFailObject(connection.ErrorCode,'Invalid field name ['+field_name+'] found in table ['+table_name+']');
					callback(res);return;
				}
			}
			if(table_name!=options.table.tableName){
				err=formJoin(query,table_name);//console.log(err);
				if(err){callback(err);return;}		
			}		
		}
		if(query.hasOwnProperty('clauses')){
			if(query.clauses.hasOwnProperty('encoded')){
				err=formClauses(query);
				if(err){callback(err);return;}	
			}
		}
		if(query.hasOwnProperty('order')){
			err = formOrdering(query);
			if(err){callback(err);return;}
		}
		if(query.hasOwnProperty('limit')){
			err = formLimit(query);
			if(err){callback(err);return;}
		}
		DatabaseOps.CustomSelect(query,function(err,rows){
			if(err){callback(err);return;}
			if(options.table.hasOwnProperty('formatResults')){
				options.table.formatResults(rows,callback);
			}else{
				TableOps.formatResults(options.table,rows,callback);
			}
		});
	}
};
function Database(options){
	var initialize=function(){
		if(options.hasOwnProperty('engine')){dbType=options.engine;}
		if(options.hasOwnProperty('dbErrorCode')){connection.ErrorCode=options.dbErrorCode;}
		if(dbType=='mysql'){
			mysql=require('mysql');
			if(options.hasOwnProperty('pools')){
				createMysqlPools(options.pools);
			}			
		}else if(dbType=='sqlite'){
			sqlite = require('sqlite3').verbose();
			sqliteTransactions = require('sqlite3-transactions').TransactionDatabase;
		}		
	};	
	var createMysqlPools=function(pools){
		var createPool=function(pool){
			if(!pool){//console.log(mysqlPools[0])
				return;
			}else{
				var mysqlPool={},options={connectionLimit:100,host:'127.0.0.1',port:3306,user:'root'
				,password:'',database:'',debug:false,pool_id:''};
				if(pool.hasOwnProperty('connectionLimit')){options.connectionLimit=pool.connectionLimit;}
				if(pool.hasOwnProperty('host')){options.host=pool.host;}
				if(pool.hasOwnProperty('port')){options.port=pool.port;}
				if(pool.hasOwnProperty('user')){options.user=pool.user;}
				if(pool.hasOwnProperty('password')){options.password=pool.password;}
				if(pool.hasOwnProperty('database')){options.database=pool.database;}
				if(pool.hasOwnProperty('debug')){options.debug=pool.debug;}	
				if(pool.hasOwnProperty('pool_id')){options.pool_id=pool.pool_id;}
				mysqlPool=mysql.createPool(options);
				mysqlPool.config.connectionConfig.multipleStatements=true;
				mysqlPool.pool_id=options.pool_id;
				mysqlPools.push(mysqlPool);
				createPool(pools.shift());
			}			
		};
		createPool(pools.shift());		
	};
	initialize();
	var ops={
		defineTable:function(options){
			connection[options.tableName] = {
				List:function(options2,callback){
					options2.table=options;
					TableOps.Select(options2,function(err,res){
						if(err){callback(err);return;}
						else{
							if(res.response_status=='FAIL'){
								res.response_id = options2.table.tableId+'E00'
								res.response_message = 'Sorry!, no '+options2.table.tableName+'s found';
								callback(false,res);return;
							}else if(res.response_status == 'OK'){
								res.response_id = options2.table.tableId+'202'
								res.response_message = 'Found '+options2.table.tableName+'(s)';
								callback(false,res);return;
							}
						}							
					});
				},
				Details:function(options2,callback){
					options2.table=options;options2.clauses={};
					var str='',response;
					if(options2.hasOwnProperty('keys')){
						for(var key in options2.keys){
							if(str == '') str+= ""+key+" = '"+options2.keys[key]+"'";
							else str += " OR "+key+" = '"+options2.keys[key]+"'";
						}
					}else{
						str = ""+options2.table.tableName+"."+options2.table.primaryKey+" = '"+options2.keyValue+"'";
					}				
					options2.clauses.decoded='WHERE '+str;
					TableOps.Select(options2,function(err,res){
						if(err){callback(err);return;}
						if(res.response_status=='FAIL'){
							res.response_id = options2.table.tableId+'E00'
							res.response_message = 'Sorry!, that '+options2.table.tableName+' cannot be found';
							callback(false,res);return;
						}else if(res.response_status=='OK'){
							response = jslib.createOkObject(options2.table.tableId+'203','Found '+options2.table.tableName+'');
							response = jslib.mergeObjects(response,res.list[0]);
							callback(false,response);
						}
					});
				},
				Insert:function(query,callback){
					query.type='INSERT',query.tableName=options.tableName;
					DatabaseOps.CustomQuery(query,function(err,res){
						if(err){callback(err);return;}
						callback(false,res);return;
					});
				},
				Update:function(query,callback){
					query.type='UPDATE',query.tableName=options.tableName;
					if(!query.hasOwnProperty('clauses')){query.clauses = {};}
					var str='';
					if(query.hasOwnProperty('keys')){
						for(var key in query.keys){
							if(str == '') str+= ""+key+" = '"+query.keys[key]+"'";
							else str += " OR "+key+" = '"+query.keys[key]+"'";
						}
					}else{
						str = ""+options.tableName+"."+options.primaryKey+" = '"+query.keyValue+"'";
					}				
					query.clauses.decoded='WHERE '+str;
					DatabaseOps.CustomQuery(query,function(err,res){
						if(err){callback(err);return;}
						callback(false,res);return;
					});
				},
				Delete:function(query,callback){
					query.type='DELETE',query.tableName=options.tableName;
					if(!query.hasOwnProperty('clauses')){query.clauses = {};}
					var str='';
					if(query.hasOwnProperty('keys')){
						for(var key in query.keys){
							if(str == '') str+= ""+key+" = '"+query.keys[key]+"'";
							else str += " OR "+key+" = '"+query.keys[key]+"'";
						}
					}else{
						str = ""+options.tableName+"."+options.primaryKey+" = '"+query.keyValue+"'";
					}				
					query.clauses.decoded='WHERE '+str;
					DatabaseOps.CustomQuery(query,function(err,res){
						if(err){callback(err);return;}
						callback(false,res);return;
					});
				},
				verifyField:function(options2){
					if(options.hasOwnProperty('verifyField')){
						return options.verifyField(options2);
					}else{
						options2.table=options;
						return 	TableOps.verifyField(options2);
					}
				}
			};
			connection.Tables.push(options);
			return false;
		},
		getConnection:function(options,callback){
			DatabaseOps.Connection(options,callback);
		},
		generateDatabase:function(options,callback){
			DatabaseOps.GenerateDB(options,callback);
		},
		getStructure:function(options,callback){
			var getStructures=function(dbConn,tables,callback){
				var structure=[];
				function getStructure(tableName){
					if(!tableName){
						callback(false,structure);
					}else{
						dbConn.query('DESCRIBE '+tableName+'',function(err,res){//console.log(res);
							if(err){callback(err);return;}
							var table={tableName:tableName,fields:{}},fieldName='';
							for(var y in res.res){
								fieldName=res.res[y]['Field'];
								table.fields[fieldName]={};
								table.fields[fieldName]['type']=res.res[y]['Type'];
								table.fields[fieldName]['null']=res.res[y]['Null'];
								table.fields[fieldName]['key']=res.res[y]['Key'];
								table.fields[fieldName]['default']=res.res[y]['Default'];					
							}
							structure.push(table);
							getStructure(tables.shift());
						});
					}
				}
				getStructure(tables.shift());		
			}
			DatabaseOps.Connection(options,function(err,conn){
				if(err){callback(err);return;}
				conn.query('SHOW tables',function(err,res){//console.log(res);
					if(err){callback(err);return;}
					var tables=[];
					for(var x in res.res){
						tables.push(res.res[x]['Tables_in_hotspotgator']);
					}
					getStructures(conn,tables,function(err,res){
						callback(false,conn.Tables,res);
					});			
				});
			});			
		}		
	};
	return ops;
};


