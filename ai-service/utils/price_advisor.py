import random

def get_price_advice(crop, location, market_data, language="hindi"):
    """
    Generates personalized AI advice based on market prices.
    """
    if not market_data or len(market_data) == 0:
        if language == "hindi":
            return f"Maaf kijiye, abhi hamare paas {crop} ke liye current prices nahi hain."
        return f"Sorry, I don't have current prices for {crop} right now."
    
    try:
        # Sort to find the best price
        sorted_data = sorted(market_data, key=lambda x: int(x.get('modal_price', 0)), reverse=True)
        best_record = sorted_data[0]
        modal_prices = [int(x.get('modal_price', 0)) for x in market_data if x.get('modal_price')]
        avg_price = sum(modal_prices) / len(modal_prices) if modal_prices else 0
        
        current_price = int(best_record.get('modal_price', 0))
        
        if language == "hindi":
            advice = f"{crop} ka sabse accha bhav {best_record.get('market', 'paas ki')} mandi mein ₹{current_price}/kg mil raha hai. "
            if current_price > avg_price:
                advice += "Aaj ka bhav pichle kuch dino se behtar hai, bechne ke liye accha samay hai."
            else:
                advice += "Abhi bhav thoda sthir hai. Agar aapko jaldi nahi hai toh thoda intezaar kar sakte hain."
            
            advice += f"\nMandi: {best_record.get('market')} ({best_record.get('district', '')})"
        else:
            advice = f"The best price for {crop} is ₹{current_price}/kg at {best_record.get('market', 'nearby')} market. "
            if current_price > avg_price:
                advice += "The price is better than average today, it's a good time to sell."
            else:
                advice += "The price is currently stable. You might wait for a better rate if not in a hurry."
                
        return advice
    except Exception as e:
        print(f"Error in price_advisor: {e}")
        return "Bhav ki jankari mil rahi hai, kripya thodi der mein check karein."
