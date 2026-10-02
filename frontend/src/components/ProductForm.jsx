import { useState } from "react";
import Icon from "./Icon.jsx";

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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
            name="sellingPrice"
            type="number"
            value={form.sellingPrice}
            onChange={handleChange}
            placeholder="2500"
          />
        </label>
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