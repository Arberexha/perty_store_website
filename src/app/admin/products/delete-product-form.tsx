"use client";

import { deleteProduct } from "../actions";

export function DeleteProductForm({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteProduct}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${name}" and all its variants and prices? This cannot be undone. Past orders will remain.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="table-link danger" type="submit" aria-label={`Delete ${name}`}>Delete</button>
    </form>
  );
}
