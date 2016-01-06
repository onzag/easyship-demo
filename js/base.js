/*
 * @class Cargo
 * @param {number} volume the volume of the cargo
 * @param {number|null} weight the weight of the cargo (can be null)
 * @param {number|null} clearance the cost of the clearance of the cargo (can be null)
**/
function Cargo(volume,weight,clearance){
	this.volume = volume;
	this.weight = weight;
	this.clearance = clearance;
	this.duties = [];
}

/*
 * @method addDutyCode
 * Adds a duty code to the cargo so that it can be checked in the border
 * @param {string} code the code to add
**/
Cargo.prototype.addDutyCode = function(code){
	this.duties.push(code);
}

/*
 * @class Warehouse
 * @param {number} longitude the longitude in the map
 * @param {number} latitude the latitude in the map
**/
function Warehouse(longitude,latitude){
	this.longitude = longitude;
	this.latitude = latitude;
}

/*
 * @class Leg
 * @param {Warehouse} warehouseFrom the warehouse where the leg comes from
 * @param {Warehouse} warehouseTo the warehouse where the leg goes to
**/
function Leg(warehouseFrom,warehouseTo){
	this.from = warehouseFrom;
	this.to = warehouseTo;
	this.ppk = 0;
	this.ppcc = 0;
	this.border = null;
	this.border_percent = 0;
}

/*
 * @method setPPK
 * Set the price per kilogram
 * @param {number} price the price to set per kilogram
**/
Leg.prototype.setPPK = function(price){
	this.ppk = price;
}

/*
 * @method setPPCC
 * Set the price per cubic centimiter
 * @param {number} price the price to set per cubic centimiter
**/
Leg.prototype.setPPCC = function(price){
	this.ppcc = price;
}

/*
 * @method setBorder
 * Set a country border in the leg
 * @param {Border} border the border to set
 * @param {number} percent a number from 0 to 1 in which the border touches the leg
 *                         where zero would be just in warehouse from, and 1 just in warehouse to
**/
Leg.prototype.setBorder = function(border,percent){
	if (percent > 1 || percent < 0){
		throw new Error('Percent must be from 0 to 1');
	} else if (!(border instanceof Border)){
		throw new Error('Invalid Border')
	}
	this.border = border;
	this.border_percent = percent;
}

/*
 * @method getTripPrice
 * Gives the trip price of an specific cargo in a leg
 * @param {Cargo} the cargo to set
 * @param {number} accumulated it's a number to use in international trips as a reference for the money
 *		               accumulated in other leg trips for tax usage and others
 * @return {Object} containing the price and accumulated value
**/
Leg.prototype.getTripPrice = function(cargo,accumulated){
	if (!(cargo instanceof Cargo)){
		throw new Error('Invalid Cargo');
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
		var bprice = (this.border_percent*price) + cargo.value + (cargo.clearance || 0) + accum;
		cargo.duties.forEach(function(code){
			price += this.border.getCrossPrice(code,bprice);
		});
		accum = ((1 - this.border_percent)*price);
	} else {
		accum += price;
	}
	
	return {'price':price,'accumulated':accumulated};
}

/*
 * @class Border
**/
function Border(){
	this.duties = {};
}

/*
 * @method addDuty
 * Adds a duty to the border which will be used for taxes and price calculations when crossed
 * @param {Duty} duty the duty to add
**/
Border.prototype.addDuty = function(duty){
	if (!(duty instanceof Duty)){
		throw new Error('Invalid Duty');
	} else if (this.duties[duty.code]){
		throw new Error('A duty with the same code is already set in the border');
	}

	this.duties[duty.code] = duty;
}

/*
 * @method getCrossPrice
 * Provides the crossing price of a given value and a code
 * @param {string} code the code to check by
 * @param {number} value the value to apply taxes on
**/
Border.prototype.getCrossPrice = function(code,value){
	if (!this.duties[code]){
		return 0;
	} else {
		return this.duties[code].calculate(value);
	}
}

/*
 * @class Duty
 * @param {string} code the code which that duty uses
**/
function Duty(code){
	this.code = code;
	this.rules = [];
}

/*
 * @method addRule
 * Adds a new rule to the given duty to apply for tax calculation
 * @param {Rule} rule the rule to add
**/
Duty.prototype.addRule = function(rule){
	if (!(rule instanceof Ruty)){
		throw new Error('Invalid Rule')
	}
	this.rules.push(rule);
}

/*
 * @method calculate
 * Calculates the added value of the duty for that specific value
 * @param {number} value the value to check against
**/
Duty.prototype.calculate = function(value){
	var fVal = value;
	this.rules.forEach(function(rule){
		fVal = rule.calculate(fVal);
	});
	return fVal;
}

/*
 * @class Rule
 * @param {string} factor can be '*' or '+' in reference to multiply or add
 * @param {number} value the value to use for that arimethic action
**/
function Rule(factor,value){
	if (factor !== '*' && factor !== "+"){
		throw new Error('Invalid Factor');
	} else if (typeof(value) !== "number"){
		throw new Error('Invalid Value');
	}
	this.factor = factor;
	this.value = value;
}

/*
 * @method calculate
 * Calculates the result of the rule for a given value
 * @param {number} value the value to check against
**/
Rule.prototype.calculate = function(value){
	if (this.factor === '*'){
		return value*this.value;
	} else {
		return value+this.value;
	}
}
