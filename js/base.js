//CARGO////////////////////////////////////////////////////////////////////////////
function Cargo(volume,weight,clearance){
	this.volume = volume;
	this.weight = weight;
	this.clearance = clearance;
	this.duties = [];
}

Cargo.prototype.addDutyCode = function(code){
	this.duties.push(code);
}

//WAREHOUSE CLASS//////////////////////////////////////////////////////////////////
function Warehouse(longitude,latitude){
	this.longitude = longitude;
	this.latitude = latitude;
}

//LEG CLASS ///////////////////////////////////////////////////////////////////////
function Leg(warehouseFrom,warehouseTo){
	this.from = warehouseFrom;
	this.to = warehouseTo;
	this.ppk = 0;
	this.ppcc = 0;
	this.border = null;
	this.border_percent = 0;
}

//Set price per kilogram
Leg.prototype.setPPK = function(price){
	this.ppk = price;
}

//Set price per cubic centimiter
Leg.prototype.setPPCC = function(price){
	this.ppcc = price;
}

//Set a country border
Leg.prototype.setBorder = function(border,percent){
	if (percent > 1 || percent < 0){
		throw new Error('Percent must be from 0 to 1');
	} else if (!(border instanceof Border)){
		throw new Error('Invalid Border')
	}
	this.border = border;
	this.border_percent = percent;
}

//get the trip price
Leg.prototype.getTripPrice = function(cargo,accumulated){
	if (!(cargo instanceof Cargo)){
		throw new Error('Invalid Cargo')
	}

	var accum = accumulated || 0;

	var priceV = this.ppcc*cargo.volume;
	var price;
	if (cargo.weight !== null){
		var priceM = this.ppk*cargo.weight;
		price = (priceM > priceV) ? priceM : priceV;
	} else {
		price = priceV;
	}

	if (this.border !== null){
		var bprice = (this.border_percent*price) + cargo.value + cargo.clearance + accum;
		cargo.duties.forEach(function(code){
			price += this.border.getCrossPrice(code,value);
		});
		accum = ((1 - this.border_percent)*price);
	} else {
		accum += price;
	}
	
	return [price,accum];
}

//BORDER CLASS /////////////////////////////////////////////////////////////////////////
function Border(){
	this.duties = {};
}

Border.prototype.addDuty = function(duty){
	if (!(duty instanceof Duty)){
		throw new Error('Invalid Duty');
	} else if (this.duties[duty.code]){
		throw new Error('A duty with the same code is already set in the border');
	}

	this.duties[duty.code] = duty;
}

Border.prototype.getCrossPrice = function(code,value){
	if (!this.duties[code]){
		return 0;
	} else {
		return this.duties[code].calculate(value);
	}
}

//DUTY CLASS////////////////////////////////////////////////////////////////////////////
function Duty(code){
	this.code = code;
	this.rules = [];
}

Duty.prototype.addRule = function(rule){
	if (!(rule instanceof Ruty)){
		throw new Error('Invalid Rule')
	}
	this.rules.push(rule);
}

Duty.prototype.calculate = function(value){
	return this.rules.map(function(rule){return rule.calculate(value)}).reduce(function(pv, cv) { return pv + cv; }, 0);
}

//RULE CLASS////////////////////////////////////////////////////////////////////////////
function Rule(factor,value){
	if (factor !== '*' && factor !== "+"){
		throw new Error('Invalid Factor');
	} else if (typeof(value) !== "number"){
		throw new Error('Invalid Value');
	}
	this.factor = factor;
	this.value = value;
}

Rule.prototype.calculate = function(value){
	if (this.factor === '*'){
		return value*this.value;
	} else {
		return value+this.value;
	}
}
