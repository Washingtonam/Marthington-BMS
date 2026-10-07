import { useState } from "react";
import Icon from "./Icon.jsx";
import {
  calculateMarkup,
  DEFAULT_PRODUCT_MARKUP,
  suggestSellingPrice
} from "../utils/productPricing.js";

const initialForm = {
  name: "",
  costPrice: "",
  sellingPrice: "",
  stock: ""
};

const ProductForm = ({ onCreate }) => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [markup, setMarkup] = useState(String(DEFAULT_PRODUCT_MARKUP));
  const [customSellingPrice, setCustomSellingPrice] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "sellingPrice") {
      setCustomSellingPrice(true);
      setMarkup(calculateMarkup(form.costPrice, value));
      setForm((current) => ({ ...current, sellingPrice: value }));
      return;
    }
    if (name === "costPrice") {
      if (customSellingPrice) setMarkup(calculateMarkup(value, form.sellingPrice));
      setForm((current) => ({
        ...current,
        costPrice: value,
        sellingPrice: customSellingPrice ? current.sellingPrice : suggestSellingPrice(value, markup)
      }));
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleMarkupChange = (value) => {
    setMarkup(value);
    setCustomSellingPrice(false);
    setForm((current) => ({
      ...current,
      sellingPrice: suggestSellingPrice(current.costPrice, value)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (
      !form.name.trim() ||
      form.costPrice === "" ||
      form.sellingPrice === "" ||
      form.stock === ""
    ) {
      setError("All product fields are required.");
      return;
    }

    setLoading(true);

    try {
      await onCreate({
        name: form.name.trim(),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        stock: Number(form.stock)
      });

      setForm(initialForm);
      setMarkup(String(DEFAULT_PRODUCT_MARKUP));
      setCustomSellingPrice(false);
    } catch (requestError) {
      setError(requestError.message || "Could not create product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="tool-panel product-form" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <h2>Add product</h2>
          <p>Owner-only inventory creation.</p>
        </div>
        <Icon name="add" />
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <label>
        Product name
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Premium notebook"
        />
      </label>

      <div className="form-grid">
        <label>
          Cost Price
          <input
            min="0"
            step="any"
            name="costPrice"
            type="number"
            value={form.costPrice}
            onChange={handleChange}
            placeholder="1500"
          />
        </label>

        <label>
          Selling Price
          <input
            min="0"
            step="any"
            name="sellingPrice"
            type="number"
            value={form.sellingPrice}
            onChange={handleChange}
            placeholder="2500"
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Markup (%)
          <input
            step="any"
            type="number"
            value={markup}
            onChange={(event) => handleMarkupChange(event.target.value)}
          />
        </label>
        <p className="self-end text-xs text-slate-500">Enter a selling price directly to calculate its exact markup.</p>
      </div>

      <label>
        Stock
        <input
          min="0"
          name="stock"
          type="number"
          value={form.stock}
          onChange={handleChange}
          placeholder="30"
        />
      </label>

      <button className="primary-button" type="submit" disabled={loading}>
        <Icon className={loading ? "spin" : ""} name={loading ? "loader" : "add"} />
        <span>Create product</span>
      </button>
    </form>
  );
};

export default ProductForm;