package java.util;

import java.util.function.Consumer;
import java.util.function.DoubleConsumer;
import java.util.function.IntConsumer;
import java.util.function.LongConsumer;

public interface PrimitiveIterator<T, T_CONS> extends Iterator<T> {
    @SuppressWarnings("overloads")
    void forEachRemaining(T_CONS action);

    public static interface OfInt extends PrimitiveIterator<Integer, IntConsumer> {
        int nextInt();

        default void forEachRemaining(IntConsumer action) {
            if(action == null)
                throw new NullPointerException();
            while (hasNext())
                action.accept(nextInt());
        }

        @Override
        default Integer next() {
            return nextInt();
        }

        @Override
        default void forEachRemaining(Consumer<? super Integer> action) {
            if (action instanceof IntConsumer) {
                forEachRemaining((IntConsumer) action);
            }
            else {
                if(action == null)
                    throw new NullPointerException();
                forEachRemaining((IntConsumer) action::accept);
            }
        }

    }

    public static interface OfLong extends PrimitiveIterator<Long, LongConsumer> {
        long nextLong();

        default void forEachRemaining(LongConsumer action) {
            if(action == null)
                throw new NullPointerException();
            while (hasNext())
                action.accept(nextLong());
        }

        @Override
        default Long next() {
            return nextLong();
        }

        @Override
        default void forEachRemaining(Consumer<? super Long> action) {
            if (action instanceof LongConsumer) {
                forEachRemaining((LongConsumer) action);
            }
            else {
                if(action == null)
                    throw new NullPointerException();
                forEachRemaining((LongConsumer) action::accept);
            }
        }
    }

    public static interface OfDouble extends PrimitiveIterator<Double, DoubleConsumer> {
        double nextDouble();

        default void forEachRemaining(DoubleConsumer action) {
            if(action == null)
                throw new NullPointerException();
            while (hasNext())
                action.accept(nextDouble());
        }

        @Override
        default Double next() {
            return nextDouble();
        }

        @Override
        default void forEachRemaining(Consumer<? super Double> action) {
            if (action instanceof DoubleConsumer)
                forEachRemaining((DoubleConsumer) action);
            else {
                if(action == null)
                    throw new NullPointerException();
                forEachRemaining((DoubleConsumer) action::accept);
            }
        }
    }
}
