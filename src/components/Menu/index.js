import React, { Component } from 'react';

import { withFirebase } from '../Firebase';

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dataFetched: false,
      error: false,
      menu: { drinks: 0, dishes: 0 },
      table: '',
      order: {
        cost: 0,
        end: "23:03",
        ready: false,
        start: "12:36",
        table: '',
        items: {
          dishes: [],
          drinks: [],
        }
      },
    };
  };

  componentWillMount() {
    this.fetchMenu(this.props.match.params.uid);
    // VER SI SE PUEDE PASAR LOS VALIDADORES DE ORDEN A OTRA FUNCION Y NO EN EL MONTADO
    this.orderIsValid(this.props.match.params.uid);
    this.tableIsValid(this.props.match.params.uid);
    console.dir(this.state);
  }

  componentWillUnmount() {
    this.props.firebase.users().off();
  }

  fetchMenu = (uid) => {
    this.props.firebase.userMenu(uid).on('value', snapshot => {
      if(snapshot.val() !== null) {
        let newMenu = { drinks: 0, dishes: 0 };
        if(snapshot.val().dishes !== 0) newMenu.dishes = snapshot.val().dishes.filter(el => el.available);
        if(snapshot.val().drinks !== 0) newMenu.drinks = snapshot.val().drinks.filter(el => el.available);
        
        this.setState({ 
          menu: newMenu, 
          dataFetched: true, 
          table: Number(this.props.match.params.table),
          order: { ...this.state.order, table: Number(this.props.match.params.table)},
        });

      } else {
        this.setState({ error: 'data not found' });
      }
    });
  }

  tableIsValid = (uid) => {
    let tableIsValid = false;
    this.props.firebase.userTables(uid).on('value', snapshot => {
      if(snapshot.val() !== null) {
        let fetchedTables = snapshot.val();
        for(let i=0; i<fetchedTables.length; i++) {
          if(fetchedTables[i].number === this.state.table) {
            tableIsValid = true;
            break;
          }
        }
      }
      this.setState({ tableIsValid });
    })
  }

  orderIsValid = (uid) => {
    let orderIsValid = true;
    let fetchedOrders;
    this.props.firebase.userOrders(uid).on('value', async snapshot => {
      if(snapshot.val() !== null) {
        fetchedOrders = snapshot.val();
        for(let i=0; i<fetchedOrders.current.length; i++) {
          if(fetchedOrders.current[i].table === this.state.table) {
            orderIsValid = false;
            break;
          }
        }
      }
      this.setState({ orderIsValid, fetchedOrders });
    })
  }

  sendOrder = (uid) => {
    if(this.state.tableIsValid === false) {
      this.setState({ error: "Check table number" });
      return;
    }

    if(this.state.orderIsValid === false) {
      this.setState({ error: "Order number is invalid" });
      return;
    }

    console.log('final block');

    let newOrders = {...this.state.fetchedOrders};
    let order = {...this.state.order};
    // first if order is empty and set empty categories to 0;
    if(order.items.dishes.length === 0) {
      order.items.dishes = 0;
    }

    if(order.items.drinks.length === 0) {
      order.items.drinks = 0;
    }

    newOrders.current.push(order);
    console.dir(newOrders);
    //this.props.firebase.userOrders(uid).set(newOrders);
  }

  itemExistsInOrder = (name, type) => {
    // inmutable
    let exists = this.state.order.items[type].find(item => item.name === name);
    return exists === undefined ? false : true;
  }

  addItem = (item, type) => {
    if(this.itemExistsInOrder(item.name, type)) return;
    let newOrder = {...this.state.order};
    let newCost = newOrder.cost + this.getItemCost(item.name, type);
    let orderItem = { name: item.name, qty: 1 };
    let newItems = [...this.state.order.items[type]];
    newItems.push(orderItem);
    newOrder.items[type] = newItems;
    newOrder.cost = newCost;
    this.setState({ order: newOrder });
  }

  getItemCost = (name, type) => {
    return this.state.menu[type].find(el => el.name === name).price;
  };

  deleteItem = (item, type) => {
    let newOrders = {...this.state.order};
    newOrders.items[type] = newOrders.items[type].filter(el => el.name !== item.name);
    let itemCost = this.getItemCost(item.name, type) * item.qty;
    newOrders.cost = newOrders.cost - itemCost;
    this.setState({ order: newOrders });
  }

  upgradeItemQty = (name, type, qty) => {  
    let newOrder = {...this.state.order};
    let itemIndex = newOrder.items[type].findIndex(el => el.name == name);
    if(newOrder.items[type][itemIndex].qty === 1 && qty === -1) return;
    newOrder.items[type][itemIndex].qty = newOrder.items[type][itemIndex].qty + qty;
    let itemCost = this.getItemCost(name, type);
    if(qty === -1) {
      newOrder.cost = newOrder.cost - itemCost; 
    } else {
      newOrder.cost = newOrder.cost + itemCost;
    }
    this.setState({ order: newOrder });
  }

  render() {
    const orderIsEmpty = this.state.order.items.dishes.length === 0 && this.state.order.items.drinks.length === 0;
    const { dataFetched, order } = this.state;
    const { drinks, dishes } = this.state.menu;
    const drinksIsEmpty = (drinks.length === 0 || drinks === 0 ) ? true : false;
    const dishesIsEmpty = (dishes.length === 0 || dishes === 0 ) ? true : false;
    const orderDrinksIsEmpty = order.items.drinks.length === 0 ? true : false;
    const orderDishesIsEmpty = order.items.dishes.length === 0 ? true : false;

    return (
      <div className="clientMenu"> 
        {!dataFetched ? (
          <>
            <h1>Menu</h1>
          </>
        )
          :
        (
          <>
            <h2 onClick={() => console.log(this.state)}>Table {this.state.table}</h2>
            <div className="menu">
              <div>
                <h4 onClick={() => console.log(this.state)}>Bebidas</h4> 
                {drinksIsEmpty ? 
                  <h3>No hay bebidas registradas</h3>
                :
                  <ol>
                    {drinks && drinks.map((item, idx) =>
                      <li key={idx} onClick={() => this.addItem(item, 'drinks')}>{item.name} - ${item.price}</li>
                    )}
                  </ol>
                }
              </div>
              <div>
                <h4>Comidas</h4>
                {dishesIsEmpty ? 
                  <h3>No hay comidas registradas</h3>
                :
                  <ol>
                    {dishes && dishes.map((item, idx) => 
                      <li key={idx} onClick={() => this.addItem(item, 'dishes')}>{item.name} - ${item.price}</li>        
                    )}
                  </ol>
                }
              </div>
            </div>

            <div className="clientMenu_orderForm">
              <div>
                <div>
                  {!orderDrinksIsEmpty && (
                    <>
                      <h4>Drinks</h4>
                      <ul>
                        {order.items.drinks.map((item, idx) => 
                          <li key={idx}>
                            <div>
                              {item.name} - x {item.qty}
                            </div>
                            <div id="itemQty">
                              <div>
                                <button onClick={() => this.upgradeItemQty(item.name, 'drinks', 1)}>+</button>
                              </div>
                              <div>
                                <button onClick={() => this.upgradeItemQty(item.name, 'drinks', -1)}>-</button>
                              </div>
                            </div>
                            <button onClick={() => this.deleteItem(item, 'drinks')}>X</button>
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
                <div>
                  {!orderDishesIsEmpty && (
                    <>
                      <h4>Dishes</h4>
                      <ul>
                        {order.items.dishes.map((item, idx) => 
                          <li key={idx}>
                            <div>
                              {item.name} - x {item.qty}
                            </div>
                            <div id="itemQty">
                              <div>
                                <button onClick={() => this.upgradeItemQty(item.name, 'dishes', 1)}>+</button>
                              </div>
                              <div>
                                <button onClick={() => this.upgradeItemQty(item.name, 'dishes', -1)}>-</button>
                              </div>
                            </div>
                            <button onClick={() => this.deleteItem(item, 'dishes')}>X</button>
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              <hr />
              <div>
                <h3>Order cost: ${this.state.order.cost}</h3>
                <button disabled={orderIsEmpty} onClick={() => this.sendOrder(this.props.match.params.uid)}>TEST ORDER</button>
              </div>
            </div>
          </>
        )}

        {this.state.error && <p>{this.state.error}</p>}
      </div>
    );
  }
}

export default withFirebase(Menu);



// FLAN cant 1, (con numeros para aumentar o disminuir cantidad)      eliminar
// si se da clic a lo mismo en el menu no pasa nada 


// cuando se agrega algo abajo sale el total de la orden