import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(product => product.id === productId);
      const products = [...cart];
      
      const stock = await api.get<Stock>(`/stock/${productId}`);
      const cartAmount = productAlreadyInCart ? productAlreadyInCart.amount : 0;

      if (stock.data.amount < (cartAmount + 1)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyInCart) {
        const index = products.findIndex((product => product.id === productId));

        products[index].amount += 1;

      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = { 
          ...product.data, 
            amount: 1 
        }

        products.push(newProduct);
      }

      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const productExists = cart.find(product => product.id === productId);

      if(!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const products = cart.filter(product => product.id !== productId);

      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
    } catch {
      toast.error('Erro ao adicionar deletar.');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);
      
      if (stock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 

      const products = [...cart];
      const productExists = products.find(product => product.id === productId);

      if (!productExists) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      productExists.amount = amount;
      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
